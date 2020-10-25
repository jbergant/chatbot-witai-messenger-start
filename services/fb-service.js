'use strict';
const axios = require('axios');
const config = require('../config/dev');
const userService = require('./user-service');


let _changeConvState;
module.exports = {


    setChangeConvState(changeConvState) {
        _changeConvState = changeConvState;
    },


    /**
     * handle Wit response
     * Forward messages to the bot or handle extra action if set
     * @param sender
     * @param response
     */
    handleWitAiResponse: function(sender, sessionIds, userData, response) {
        let self = module.exports;
        self.sendTypingOff(sender);

        let intents = response.intents;

        //let entities = response.entities;


        if (self.isDefined(intents) && intents[0] !== undefined) {
            self.handleWitIntent(sender, sessionIds, userData, response);
        } else {
            // @TODO: what happens here???
            self.sendTextMessage(sender, "No intent found.");
        }
    },

    /**
     * Pass control of the conversation to page inbox
     * @param senderID
     */
    sendPassThread: function(senderID) {
        request({
            uri: "https://graph.facebook.com/v2.6/me/pass_thread_control",
            qs: { access_token: config.FB_PAGE_TOKEN },
            method: "POST",
            json: {
                recipient: {
                    id: senderID
                },
                target_app_id: config.FB_PAGE_INBOX_ID // ID in the page inbox setting under messenger platform
            }
        });
    },

    /**
     * prepare messages to be sent.
     * Card messages will be joined to galleries
     * @param messages
     * @param sender
     */
    handleWitIntent: function(sender, sessionIds, userData, response) {
        let self = module.exports;
        /*let intents = response.intents;
        let queryText = response.text;
        let traits = response.traits;*/

        await self.sendTextMessage(sender, 'A response from a bot :)');
    },


    sendOneTimeNotification: async function(recipientId, one_time_notifiaction) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type:"template",
                    payload: {
                      template_type:"one_time_notif_req",
                      title: one_time_notifiaction.title,
                      payload: one_time_notifiaction.payload
                    }
                  }
                }
            };
        

        await self.callSendAPI(messageData);
    },


    /*
     * Send a message with Quick Reply buttons.
     *
     */
    sendQuickReply: async function(recipientId, text, replies, metadata) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: text,
                metadata: self.isDefined(metadata) ? metadata : '',
                quick_replies: replies
            }
        };

        await self.callSendAPI(messageData);
    },

    /*
     * Send an image using the Send API.
     *
     */
    sendImageMessage: async function(recipientId, payload) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "image",
                    payload
                }
            }
        };

        await self.callSendAPI(messageData);
    },

        /*
     * Send a video using the Send API.
     * example fileName: fileName"/assets/test.txt"
     */
    sendFileMessage: async function(recipientId, payload) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "file",
                    payload
                }
            }
        };

        await self.callSendAPI(messageData);
    },

        /*
     * Send audio using the Send API.
     *
     */
    sendAudioMessage: async function(recipientId, payload) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "audio",
                    payload
                }
            }
        };

        await self.callSendAPI(messageData);
    },

        /*
     * Send a video using the Send API.
     * example payload
     */
    sendVideoMessage: async function(recipientId, payload) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "video",
                    payload
                }
            }
        };
        await self.callSendAPI(messageData);
    },

    /*
     * Turn typing indicator on
     *
     */
    sendTypingOn: async function(recipientId) {
        let self = module.exports;

        var messageData = {
            recipient: {
                id: recipientId
            },
            sender_action: "typing_on"
        };

        await self.callSendAPI(messageData);
    },

    /*
     * Turn typing indicator off
     *
     */
    sendTypingOff: async function(recipientId) {
        let self = module.exports;
   
        var messageData = {
            recipient: {
                id: recipientId
            },
            sender_action: "typing_off"
        };

        await self.callSendAPI(messageData);
    },

     /*
     * Send a text message using the Send API.
     *
     */
    sendTextMessage: async function(recipientId, text) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: text
            }
        }
        await self.callSendAPI(messageData);
    },

     /*
     * Send a button message using the Send API.
     *
     */
    sendButtonMessage: async function(recipientId, text, buttons) {
        let self = module.exports;
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "button",
                        text: text,
                        buttons: buttons
                    }
                }
            }
        };

        await self.callSendAPI(messageData);
    },

    /*
     * Call the Send API. The message data goes in the body. If successful, we'll
     * get the message id in a response
     *
     */
    callSendAPI: async function(messageData) {
        try {
            const response = await axios.post(
                `https://graph.facebook.com/v8.0/me/messages?access_token=${config.FB_PAGE_TOKEN}`,
                messageData
            );
            const body = response.data;
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
            // console.log(messageData);
            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } catch (error) {
            console.log("Failed calling Send API");
            console.log(error.response.data.error);
        }
        
    },

    isDefined: function(obj) {
        if (typeof obj == 'undefined') {
            return false;
        }

        if (!obj) {
            return false;
        }

        return obj != null;
    }

}