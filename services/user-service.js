'use strict';
const axios = require('axios');
const config = require('../config/dev.js');
const uuid = require('uuid');
const Firestore = require('@google-cloud/firestore');

const db = new Firestore({
    projectId: config.GOOGLE_PROJECT_ID,
    keyFilename: config.FIRESTORE_KEY_PATH,
});

let _updateSessionAndUser;
module.exports = {
    /**
     * set a reference to updateSessionAndUser method
     * @param updateSessionAndUser
     */
    setUpdateSessionAndUser(updateSessionAndUser) {
        _updateSessionAndUser = updateSessionAndUser;
    },

    /**
     * change conversation state in the database
     * @param sessionId
     * @param state
     */
    changeUserState: function(sessionId, state) {
        if (sessionId && state) {
            var userRef = db.collection('users').doc(sessionId)
                .update({
                    conv_state: state,
                    conv_state_update: Firestore.Timestamp.now()
                })
                .then(function() {
                    console.log("Document successfully updated!");
                })
                .catch(err => {
                    console.log('Error updating documents 39*');
                });
        }

    },


    /**
     * add a user to db ih he/she is not there or read info about user
     * @param userId
     * @returns {Promise<QuerySnapshot>}
     */
    addOrGetUser: function(userId) {

        let usersRef = db.collection('users');
        let uniquieid = uuid.v1();
        uniquieid = uniquieid.split('-');
        uniquieid = uniquieid[uniquieid.length - 1];
        var self = this;


        return usersRef.where('facebook_id', '==', userId).limit(1).get()
            .then(async snapshot => {
                let sessionData = {};
                if (snapshot.empty) {
                    let FBData = await self.getFBData(userId);

                    let new_user = {
                        facebook_id: userId,
                        user_language: 'en-US',
                        nick_name: '',
                        conv_state: 'conv_start',
                        conv_state_update: Firestore.Timestamp.now(),
                        send_checkin: false,
                        checkin_day: 1,
                        time_diff: -1,
                        check_time: 8,
                        uuid: uniquieid
                    }
                    delete FBData.id;
                    let user = Object.assign(FBData, new_user);
   
                    // write user to DB
                    sessionData = db.collection('users').add(user).then(ref => {
                        let sessionID = ref.id;
                        return {
                            id: sessionID,
                            user
                        };
                    });

                } else {
                    snapshot.forEach(doc => {
      
                        sessionData = {
                            id: doc.id,
                            user: doc.data()
                        }


                    });

                }
                return sessionData;
            }).then((sessionData) => {
                return sessionData;
            })
            .catch(err => {
                // console.log('Error getting documents', err);
                console.log('Error getting user in addOrGetUser', err);
            });

    },


    /**
     * get users Timezone from Facebook graph
     * @param userId    
     * @returns {Promise<*>}
     */
    getFBData: async function (userId) {

        try {
            const response = await axios.get(
                `https://graph.facebook.com/v8.0/${userId}?access_token=${config.FB_PAGE_TOKEN}&fields=first_name,last_name`
            );
            let userData = response.data;

            return userData;
        } catch (error) {
            
            console.log("Failed calling Graph API");
            console.log(error.response.data.error);
            return null;
        }
    },

    /**
     * update user data in the db and save the change to session
     * @param senderID
     * @param sessionId
     * @param userNewData
     */
    updateCurrentUserAndSession: function(senderID, sessionId, userNewData) {
        db.collection('users').doc(sessionId).update(userNewData)
            .then(() => {
                _updateSessionAndUser(senderID, sessionId, userNewData);
            })
            .catch(err => {
                console.log('Error updating user', err);
            });
    },

        /**
     * read users that have not replied to a mood in more than 24 hours ... but not more then 3 days?
     * @returns {Promise<{usersSelect: Array, sessionIds: Map<any, any>}>}
     */
    getUsersForCheckin: async function() {
        let usersRef = db.collection('users');

        const currentDate = new Date();
        const currentHour = currentDate.getHours();

        return usersRef
            .where('send_checkin', '==', true)
            .get()
            .then(async snapshot => {
                let usersSelect = [];
                let sessionIds = new Map();
                if (snapshot.empty) {
                    console.log('no users for checkin');

                } else {
                    snapshot.forEach(doc => {
                        let user = doc.data();
                        console.log('users for checkin');
                        console.log(`${user.check_time} === ${currentHour}`);
                       // if (user.facebook_id && user.check_time === currentHour) {
                            sessionIds.set(user.facebook_id, doc.id);
                            usersSelect.push(user.facebook_id);
                      //  } 
                    });

                }
                console.log('return');
                console.log(usersSelect);
                return {
                    usersSelect,
                    sessionIds
                };
            }).then((usersSelect) => {
                console.log('return');
                console.log(usersSelect);
                return usersSelect;
            })
            .catch(err => {
                console.log('Error getting users for checkin: ', err);
            });
    },

}