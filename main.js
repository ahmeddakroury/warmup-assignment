const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function convert12HourToSeconds(timeStr) {
    timeStr = timeStr.trim(); 

    let [time, ampm] = timeStr.split(" ");
    let [hours, minutes, seconds] = time.split(":").map(Number);

    if (ampm.toLowerCase() === "pm" && hours !== 12) {
        hours += 12;
    }

    if (ampm.toLowerCase() === "am" && hours === 12) {
        hours = 0;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

function secondsToHMS(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600);
    let remaining = totalSeconds % 3600;

    let minutes = Math.floor(remaining / 60);
    let seconds = remaining % 60;

    minutes = String(minutes).padStart(2, "0");
    seconds = String(seconds).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

function getShiftDuration(startTime, endTime) {
    let startSec = convert12HourToSeconds(startTime);
    let endSec = convert12HourToSeconds(endTime);

    // Handle overnight shifts
    if (endSec < startSec) {
        endSec += 24 * 3600; // add 24 hours in seconds
    }

    const shift = endSec - startSec;
    return secondsToHMS(shift);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let start = convert12HourToSeconds(startTime);
    let end = convert12HourToSeconds(endTime);

    if (end < start) {
        end += 24 * 3600; // add 24 hours in seconds
    }

    const startLimit = convert12HourToSeconds("8:00:00 am");
    const endLimit = convert12HourToSeconds("10:00:00 pm");

    let idleSeconds = 0;

    if (end <= startLimit) {
        idleSeconds = end - start;
    }
    
    else if (start >= endLimit) {
        idleSeconds = end - start;
    } else {
        
        if (start < startLimit) {
            idleSeconds += startLimit - start;
        }
        
        if (end > endLimit) {
            idleSeconds += end - endLimit;
        }
    }

    return secondsToHMS(idleSeconds);
}


function HMSToSeconds(timeStr) {

    let [hours, minutes, seconds] = timeStr.split(":").map(Number);

    return hours * 3600 + minutes * 60 + seconds;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    
    let sd = HMSToSeconds(shiftDuration);
    let it = HMSToSeconds(idleTime);

    let activeTime = sd - it;
    
    return secondsToHMS(activeTime);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    let [yr, month, day] = date.split("-").map(Number);

    let quota = HMSToSeconds("8:24:00");
    let specialQuota = HMSToSeconds("6:00:00");

    let actTime = HMSToSeconds(activeTime);

    if (yr == 2025 && month == 4 && day >= 10 && day <= 30) {
        return actTime >= specialQuota;
    } else {
        return actTime >= quota;
    }

}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text filegit add
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================


function addShiftRecord(textFile, shiftObj) {

    let { driverID, driverName, date, startTime, endTime } = shiftObj;

    let data = fs.readFileSync(textFile, "utf8");
    let lines = data.trim().split("\n");

    
    for (let i = 1; i < lines.length; i++) {

        let parts = lines[i].split(",");
        let fileDriverID = parts[0];
        let fileDate = parts[2];

        if (fileDriverID === driverID && fileDate === date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(startTime, endTime);
    let idleTime = getIdleTime(startTime, endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let metQuotaResult = metQuota(date, activeTime);
    let hasBonus = false;

    let record = {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: metQuotaResult,
        hasBonus
    };

    let newLine = Object.values(record).join(",");

    let lastIndex = -1;

    for (let i = 1; i < lines.length; i++) {

        let parts = lines[i].split(",");

        if (parts[0] === driverID) 
            lastIndex = i;  
    }

    if (lastIndex === -1) {
        lines.push(newLine);
    } else {
        lines.splice(lastIndex + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n"));

    return record;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    let data = fs.readFileSync(textFile, "utf8");

    let lines = data.trim().split("\n");

    for (let i = 1; i < lines.length; i++) {

        let parts = lines[i].split(",");

        let fileDriverID = parts[0];
        let fileDate = parts[2];

        if (fileDriverID === driverID && fileDate === date) {

            parts[9] = newValue;

            lines[i] = parts.join(",");

            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, "utf8");
    let lines = data.trim().split("\n");

    let targetMonth = Number(month);

    let count = 0;
    let driverExists = false;

    for (let i = 1; i < lines.length; i++) {

        let parts = lines[i].split(",");

        let fileDriverID = parts[0];
        let date = parts[2];
        let hasBonus = parts[9].trim();

        if (fileDriverID === driverID) {

            driverExists = true;

            let rowMonth = Number(date.split("-")[1]);

            if (rowMonth === targetMonth && hasBonus === "true") {
                count++;
            }
        }
    }

    if (!driverExists) return -1;

    return count;
}
// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {

    let data = fs.readFileSync(textFile, "utf8");
    let lines = data.trim().split("\n");

    let totalSeconds = 0;

    for (let i = 1; i < lines.length; i++) {

        let parts = lines[i].split(",");

        let fileDriverID = parts[0];
        let date = parts[2];
        let activeTime = parts[7];

        let rowMonth = Number(date.split("-")[1]);

        if (fileDriverID === driverID && rowMonth === month) {

            totalSeconds += HMSToSeconds(activeTime);
        }
    }

    return secondsToHMS(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================

function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const data = fs.readFileSync(textFile, "utf8");
    const lines = data.trim().split("\n").slice(1);

    let totalRequiredSeconds = 0;

    
    const rateData = fs.readFileSync(rateFile, "utf8");
    const rateLines = rateData.trim().split("\n").slice(1);
    let dayOff = null;

    for (let line of rateLines) {
        const [id, off] = line.split(","); 
        if (id === driverID) {
            dayOff = off;
            break;
        }
    }

    for (let line of lines) {
        const [fileID, , date] = line.split(",");
        if (fileID !== driverID) continue;

        const [year, monthStr, dayStr] = date.split("-").map(Number);

        if (monthStr !== month) continue;

        let dailyQuota = 8 * 3600 + 24 * 60; 
        if (year === 2025 && monthStr === 4 && dayStr >= 10 && dayStr <= 30) {
            dailyQuota = 6 * 3600;
        }

        
        if (dayOff) {
            const shiftDate = new Date(`${year}-${monthStr}-${dayStr}`);
            const weekday = shiftDate.toLocaleDateString("en-US", { weekday: "long" });
            if (weekday === dayOff) continue; // skip this day
        }

        totalRequiredSeconds += dailyQuota;
    }

    totalRequiredSeconds -= bonusCount * 2 * 3600;

    return secondsToHMS(totalRequiredSeconds);
}


// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    const data = fs.readFileSync(rateFile, "utf8");
    const lines = data.trim().split("\n");

    let basePay = null;
    let tier = null;
    let allowedMissingHours = 0;

    for (let line of lines) {
        const [id, , pay, t] = line.split(",");
        if (id.trim() === driverID.trim()) { 
            basePay = Number(pay);
            tier = Number(t);
          
            switch (tier) {
                case 1: allowedMissingHours = 50; break;
                case 2: allowedMissingHours = 20; break;
                case 3: allowedMissingHours = 10; break;
                case 4: allowedMissingHours = 3; break;
                default: allowedMissingHours = 0; break;
            }
            break;
        }
    }

    if (tier === null) throw new Error("DriverID not found in rate file");

    const actualSec = HMSToSeconds(actualHours);
    const requiredSec = HMSToSeconds(requiredHours);

    let missingSec = requiredSec - actualSec;

    if (missingSec <= 0) return Math.floor(basePay); 

    const allowanceSec = allowedMissingHours * 3600;
    missingSec -= allowanceSec;
    if (missingSec <= 0) return Math.floor(basePay); 

    const billableHours = Math.floor(missingSec / 3600);

    const deductionRate = Math.floor(basePay / 185);

    const salaryDeduction = billableHours * deductionRate;

    const netPay = Math.floor(basePay - salaryDeduction);

    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
