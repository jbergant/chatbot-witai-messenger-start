const fbService = require('../services/fb-service');
const userService = require('../services/user-service');
const config = require('../config/dev.js');


module.exports = (app, getUserData, setSessionAndUser) => {
    /**
     * cron for mood asking question
     */
    app.get('/scripts/daily_checkin', async function(req, res) {
        let userAndSession = await userService.getUsersForCheckin();


        let sessionIds = userAndSession.sessionIds;
        let usersSelect = userAndSession.usersSelect;
        // trigger mood start intent to set approptiate contexts and send a question to all fb users
        usersSelect.forEach(async function(senderID) {
            await setSessionAndUser(senderID);

            let sessionId = sessionIds.get(senderID);
            let userData = getUserData(sessionId);
            if ( userData.checkin_day <= config.CHECKIN_DAYS) {
                let fileName = `checkin_day_${userData.checkin_day}`;
                fbService.readResponsesFromJSON(senderID, userData, fileName);
                userService.changeUserState(sessionId, 'DAILY_SENT');
            }
        });
        res.sendStatus(200);

    });

}