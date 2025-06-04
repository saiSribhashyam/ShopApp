// utils/populationHelpers.js
const User = require('../models/UserModel'); // Assuming UserModel is in ../models/

async function populateUserDetailsForPrescriptions(prescriptions) {
    if (!prescriptions) return null;
    const wasArray = Array.isArray(prescriptions);
    const prescArray = wasArray ? prescriptions : [prescriptions];

    if (prescArray.length === 0) {
        return wasArray ? [] : null;
    }

    const userPhnos = [...new Set(prescArray.map(p => p.userPhno).filter(phno => phno != null))];

    if (userPhnos.length === 0) { // No phone numbers to query by
        // Still need to convert to plain objects if not already
        const populatedPrescs = prescArray.map(p => p.toObject ? p.toObject() : p);
        return wasArray ? populatedPrescs : populatedPrescs[0];
    }

    const users = await User.find({ phno: { $in: userPhnos } }).select('name phno city gender age').lean(); // .lean() for plain JS objects

    const usersByPhno = users.reduce((acc, user) => {
        acc[user.phno] = user;
        return acc;
    }, {});

    const populatedPrescs = prescArray.map(p => {
        const prescObj = p.toObject ? p.toObject() : { ...p }; // Ensure it's a plain object
        if (usersByPhno[p.userPhno]) {
            prescObj.userDetails = usersByPhno[p.userPhno];
        } else {
            prescObj.userDetails = null;
        }
        return prescObj;
    });

    return wasArray ? populatedPrescs : populatedPrescs[0];
}

module.exports = { populateUserDetailsForPrescriptions };
