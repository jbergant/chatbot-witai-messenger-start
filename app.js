// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// [START gae_node_request_example]
const config = require('./config/dev');
const express = require('express');
const bodyParser = require('body-parser');

const fbService = require('./services/fb-service');
fbService.setChangeConvState(changeConvState);

const userService = require('./services/user-service');
userService.setUpdateSessionAndUser(updateSessionAndUser);

// Messenger API parameters
if (!config.FB_PAGE_TOKEN) {
  throw new Error('missing FB_PAGE_TOKEN');
}
if (!config.FB_VERIFY_TOKEN) {
  throw new Error('missing FB_VERIFY_TOKEN');
}
if (!config.FB_APP_SECRET) {
  throw new Error('missing FB_APP_SECRET');
}
if (!config.FB_APP_ID) { //app id
  throw new Error('missing FB_APP_ID');
}
if (!config.WIT_TOKEN) { //Wit token
  throw new Error('missing WIT_TOKEN');
}
if (!config.CHECKIN_DAYS) { //number of days the bot should check in
  throw new Error('missing CHECKIN_DAYS');
}

const app = express();

// Process application/json
app.use(bodyParser.json());


const sessionIds = new Map();
const usersMap = new Map();

app.get('/', (req, res) => {
  res
      .status(200)
      .send('Hello, my name is bot!')
      .end();
});

require('./routes/facebookRoutes')( app, setSessionAndUser, getUserData, changeConvState, fbService.handleWitAiResponse );

/**
 * set session and user
 * set the first agent from config as default agent
 * @param senderID
 */
async function setSessionAndUser(senderID, flag) {
  
  if (!usersMap.has(senderID) || !sessionIds.has(senderID)) {
      // add or get a user from a database is he or she is not in the session data
      let sessionData = await userService.addOrGetUser(senderID);

      if (sessionData.id) {
          sessionIds.set(senderID, sessionData.id);
          usersMap.set(sessionData.id, sessionData.user);
      }
      return sessionIds;
  } else {
      return sessionIds;
  }
}

/**
 * get user data from the session
 * @param sessionId
 * @returns {any}
 */
function getUserData(sessionId) {

  return usersMap.get(sessionId);
}

/**
 * upadate session data with the new user information
 * @param senderID
 * @param sessionId
 * @param user
 */
function updateSessionAndUser(senderID, sessionId, user) {
   sessionIds.set(senderID, sessionId);
   if (user) {

       user = Object.assign(usersMap.get(sessionId), user);
       usersMap.set(sessionId, user);
   }

}

/**
 * change conversation state to track and what part of the dialog user is at
 * @param senderID
 * @param state
 */
function changeConvState(senderID, state) {
  let sessionId = sessionIds.get(senderID);

  // update in the database
  userService.changeUserState(sessionId, state);

  // update in session
  let user = usersMap.get(sessionId);
  if (user) {
      user.conv_state = state;
      usersMap.set(sessionId, user);
  }

}
// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

