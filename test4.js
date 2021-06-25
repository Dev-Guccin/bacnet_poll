async function a() {//10초짜리
    sum = 0
    for (let i = 0; i < 500000000; i++) {
        sum += i
    }
    console.log("끝")
    return 1
}

setInterval(()=>{console.log("t")},5000)