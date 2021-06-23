const DBH = require('./database.js')
var Excel = require('./get_excel.js')

const bacnet = require('node-bacnet');
const bacnetConfig = require('./config.json')
const client = new bacnet(bacnetConfig);

client.on('iAm', (msg) => {
    console.log("iam : ", msg)
    console.log(
        'address: ', msg.header.sender.address,
        ' - deviceId: ', msg.payload.deviceId,
        ' - maxApdu: ', msg.payload.maxApdu,
        ' - segmentation: ', msg.payload.segmentation,
        ' - vendorId: ', msg.payload.vendorId
    );
    //데이터 받으면 DB에 넣어주기
    DBH.set_available(msg.header.sender.address)
});
client.on('whoIs', (msg) => {
    console.log("whois")
    console.log(
        'address: ', msg.header.address,
        ' - lowLimit: ', msg.payload.lowLimit,
        ' - highLimit: ', msg.payload.highLimit
    );
});
async function bacnet_poll() {
    //1. 엑셀의 설정을 db로 옮긴다.
    //await Excel.loadExcelFile()

    // Loop를 돌린다.
    //
    //
    //2. whois로 존재하는 오브젝트들 확인 → active
    client.whoIs(bacnetConfig.broadcastAddress)
    //3. db station에서 데이터를 읽는다.
    console.log("[+] start data polling....")
    idslist = await DBH.get_ids_device()
    console.log("[+] available device ids:",idslist)
    for (let i = 0; i < idslist.length; i++) {
        console.log(idslist[i].id)
        bacnet_device_poll(idslist[i].id)
    }
}
async function bacnet_device_poll(id){
    // device의 id에 해당하는 열들을 list로 받는다.
    console.log("[+] get ids from station id:",id)
    let device = await DBH.get_device_from_id(id)
    let ip_address = `${device.ip_address}`+(device.port == -1?"":":"+device.port)
    console.log("[+] connect to ip:", ip_address)
    let idslist = await DBH.get_ids_station(id)
    console.log("[+] available ids device:",id, " idslist:",idslist, " length:",idslist.length)
    for (let i = 0; i < idslist.length; i++) {
        let station = await DBH.get_station_from_id(idslist[i].id)
        console.log("station : ", station)
        if(station.active != 1) continue
        console.log("readproperty", ip_address, station.object_type, station.object_instance, 85)
        client.readProperty(ip_address, {type: station.object_type, instance: station.object_instance}, 85, (err, value) => {//85는 presentvalue를 의미한다.
            console.log('value: ', value);
            if(value){
                //데이터를 받았으니 이제 값을 realtime_table에 넣어준다.
                DBH.realtime_upsert(station.id, station.name,value.values[0].value, station.object)
            }
        });
    }
}
bacnet_poll()