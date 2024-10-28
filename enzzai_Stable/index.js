require("dotenv").config();
const fs = require("fs");
const tmi = require("tmi.js");

const config = {
  options: {
    debug: true,
  },
  connection: {
    reconnect: true,
  },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  channels: ["enzzai"],
  moderators: new Map(),
};

const client = new tmi.client(config);
client.connect();

/* 
---------------------------------------------------------
  BOT STATUS. Подключение и отключение бота.
---------------------------------------------------------
*/

client.on("connected", () => {
  const currentTime = new Date().toLocaleTimeString(); // Получаем текущее время
  client.say("Rainbyyy's chat bot", `Бот успешно подключился в ${currentTime}`);
});

/* 
-------------------------------------------------------------------
  BOT INITIALIZATION. Определение глобальных переменных и функций
-------------------------------------------------------------------
*/

// Array of stored commands
let storedCommands = [];

// Save stored commands
function saveStoredCommands() {
  const data = JSON.stringify(storedCommands);

  fs.writeFile("storedCommands.json", data, (err) => {
    if (err) {
      console.error("Error saving stored commands:", err);
    } else {
      console.log("Stored commands saved successfully.");
    }
  });
}

// Load stored commands
function loadStoredCommands() {
  fs.readFile("storedCommands.json", (err, data) => {
    if (err) {
      console.error("Error loading stored commands:", err);
    } else {
      storedCommands = JSON.parse(data);
      console.log("Stored commands loaded successfully.");
    }
  });
}
loadStoredCommands();

/* 
---------------------------------------------------------
  Custom Commands Section for Moderators
---------------------------------------------------------
*/

// Find command by partial match in stored commands array
function findCommandByPartialMatch(input) {
  const matchedCommand = storedCommands.find((command) =>
    command.includes(input)
  );
  return matchedCommand;
}

// Set intervals for custom commands
let intervalId;
let intervalId2;
let intervalId3;

let isIntervalRunning = false;
let isInterval2Running = false;
let isInterval3Running = false;

// Moderator Chat Section
client.on("chat", (channel, userstate, message, self) => {
  // Ignore messages from the bot itself
  if (self) return;

  // Check if the user is a moderator
  if (userstate.mod) {
    // Add custom chat commands
    if (message.startsWith("!Ledit")) {
      let editedMessageStore = message.split(" ");

      // Add a new command
      if (editedMessageStore[1] === "add") {
        // Remove the command name from the message
        editedMessageStore.splice(0, 2);
        let editedMessage = editedMessageStore.join(" ");
        // Check, if the command already exists
        if (!storedCommands.includes(editedMessage)) {
          storedCommands.push(editedMessage);
          saveStoredCommands();
          client.say(channel, `@${userstate.username}, команда добавлена`);
        } else {
          client.say(
            channel,
            `@${userstate.username}, такая команда уже имеется!`
          );
        }
      }

      // Delete a command
      if (editedMessageStore[1] === "del") {
        // Find the command in received message by partial match
        let commandDelete = findCommandByPartialMatch(editedMessageStore[2]);
        // Check, if the command exists in stored commands
        if (commandDelete) {
          storedCommands.splice(storedCommands.indexOf(commandDelete), 1);
          // update stored commands
          saveStoredCommands();
          client.say(channel, `@${userstate.username}, команда удалена`);
        } else {
          client.say(
            channel,
            `@${userstate.username}, такой команды не существует!`
          );
        }
      }

      // Edit a command
      if (editedMessageStore[1] === "edit") {
        // Find the command in received message by partial match
        const index = storedCommands.findIndex((command) =>
          command.includes(editedMessageStore[2])
        );
        // Check, if the command exists in stored commands
        if (index !== -1) {
          // Replace old value with new
          const parts = storedCommands[index].split(" ");
          parts.splice(1, 1, editedMessageStore[3]);
          storedCommands[index] = parts.join(" ");
          // update stored commands
          saveStoredCommands();
          client.say(
            channel,
            `@${userstate.username}, команда отредактирована`
          );
        }
      }
    }

    // Check if the message is the custom command

    // Convert message to lowercase
    let commandMessageToLowerCase = message.toLowerCase();
    if (commandMessageToLowerCase.startsWith("!")) {
      let cmdMessageStore = commandMessageToLowerCase.split(" ");
      let cmdMessageStorePartial = findCommandByPartialMatch(
        cmdMessageStore[0]
      );

      // Check if the command is valid
      if (commandMessageToLowerCase === "!") return;

      // Message Repeat Counting function
      let messageRepeatCount = commandMessageToLowerCase.match(/\d+/);
      let repeatCount = 1;
      if (messageRepeatCount) {
        repeatCount = parseInt(messageRepeatCount[0]);
      }

      // Execute the command
      if (cmdMessageStorePartial) {
        // Remove the command name from the message
        let cmdMessageStoreSplit = cmdMessageStorePartial.split(" ");
        cmdMessageStoreSplit.shift();
        let cmdMessage = cmdMessageStoreSplit.join(" ");

        // Repeat the message for the specified number of times(repeatCount)
        for (let i = 0; i < repeatCount && i < 20; i++) {
          client.say(channel, cmdMessage);
        }
      }
    }

    /* 
      ---------------------------------------------------------
      Intervals.
      ---------------------------------------------------------
    */

    // Split the message to get the command parts
    const commandParts = message.split(" ");

    // Check if the command is for setting an interval
    if (commandParts[0] === "!interval" && commandParts.length >= 6) {
      if (isIntervalRunning) {
        client.say(channel, `@${userstate.username}, интервал уже запущен!`);
        return;
      }

      // Get the interval message
      const intervalMessage = commandParts
        .slice(1, commandParts.length - 4)
        .join(" ");
      // Get the repeat count, from, to and timer interval
      const repeatCount = parseInt(commandParts[commandParts.length - 4]);
      const from = parseInt(commandParts[commandParts.length - 3]);
      const to = parseInt(commandParts[commandParts.length - 2]);
      const timerInterval = parseInt(commandParts[commandParts.length - 1]);

      // Start the timer
      function startTimer(current, to) {
        // Set the interval
        intervalId = setInterval(
          () => {
            for (let i = 0; i < repeatCount; i++) {
              client.say(channel, intervalMessage);
            }
            if (current >= to) {
              clearInterval(intervalId);
              isIntervalRunning = false;
            }
            current++;
          },
          // Convert the timer interval from seconds to milliseconds
          timerInterval * 1000
        );
      }

      // Start the timer
      startTimer(from, to);
      isIntervalRunning = true;
      client.say(channel, `@${userstate.username}, Интервал запущен`);
    }
    // Check if the command is to stop the interval
    if (commandParts[0] === "!endinterval") {
      if (!isIntervalRunning) {
        client.say(channel, `@${userstate.username}, Интервал не запущен`);
        return;
      }

      client.say(channel, `@${userstate.username}, Интервал остановлен`);
      clearInterval(intervalId);
      isIntervalRunning = false;
    }

    /* 

Second interval

*/

    // Split the message to get the command parts
    const commandParts2 = message.split(" ");

    // Check if the command is for setting an interval
    if (commandParts2[0] === "!interval2" && commandParts2.length >= 6) {
      if (isInterval2Running) {
        client.say(channel, `@${userstate.username}, интервал уже запущен!`);
        return;
      }
      // Get the interval message
      const intervalMessage = commandParts2
        .slice(1, commandParts2.length - 4)
        .join(" ");
      // Get the repeat count, from, to and timer interval
      const repeatCount = parseInt(commandParts2[commandParts2.length - 4]);
      const from = parseInt(commandParts2[commandParts2.length - 3]);
      const to = parseInt(commandParts2[commandParts2.length - 2]);
      const timerInterval = parseInt(commandParts2[commandParts2.length - 1]);

      // Start the timer
      function startTimer2(current, to) {
        // Set the interval
        intervalId2 = setInterval(
          () => {
            for (let i = 0; i < repeatCount; i++) {
              client.say(channel, intervalMessage);
            }
            if (current >= to) {
              clearInterval(intervalId2);
              isInterval2Running = false;
            }
            current++;
          },
          // Convert the timer interval from milliseconds to seconds
          timerInterval * 1000
        );
      }

      // Start the timer
      startTimer2(from, to);
      isInterval2Running = true;
      client.say(channel, `@${userstate.username}, Интервал 2 запущен`);
    }
    // Check if the command is to stop the interval
    if (commandParts2[0] === "!endinterval2") {
      if (!isInterval2Running) {
        client.say(channel, `@${userstate.username}, Интервал 2 не запущен`);
        return;
      }
      client.say(channel, `@${userstate.username}, Интервал 2 остановлен`);
      clearInterval(intervalId2);
      isInterval2Running = false;
    }

    /* 
    
    Third interval.

    */

    // Split the message to get the command parts
    const commandParts3 = message.split(" ");

    // Check if the command is for setting an interval
    if (commandParts3[0] === "!interval3" && commandParts3.length >= 6) {
      if (isInterval3Running) {
        client.say(channel, `@${userstate.username}, интервал уже запущен!`);
        return;
      }
      // Get the interval message
      const intervalMessage = commandParts3
        .slice(1, commandParts3.length - 4)
        .join(" ");
      // Get the repeat count, from, to and timer interval
      const repeatCount = parseInt(commandParts3[commandParts3.length - 4]);
      const from = parseInt(commandParts3[commandParts3.length - 3]);
      const to = parseInt(commandParts3[commandParts3.length - 2]);
      const timerInterval = parseInt(commandParts3[commandParts3.length - 1]);

      // Start the timer
      function startTimer3(current, to) {
        // Set the interval
        intervalId3 = setInterval(
          () => {
            for (let i = 0; i < repeatCount; i++) {
              client.say(channel, intervalMessage);
            }
            if (current >= to) {
              clearInterval(intervalId3);
              isInterval3Running = false;
            }
            current++;
          },
          // Convert the timer interval from seconds to milliseconds
          timerInterval * 1000
        );
      }

      // Start the timer
      startTimer3(from, to);
      isInterval3Running = true;
      client.say(channel, `@${userstate.username}, Интервал 3 запущен`);
    }
    // Check if the command is to stop the interval
    if (commandParts3[0] === "!endinterval3") {
      if (!isInterval3Running) {
        client.say(channel, `@${userstate.username}, Интервал 3 не запущен`);
        return;
      }
      client.say(channel, `@${userstate.username}, Интервал 3 остановлен`);
      clearInterval(intervalId3);
      isInterval3Running = false;
    }
    if (commandParts[0] === "!clearintervals") {
      client.say(channel, `@${userstate.username}, интервалы остановлены`);
      clearInterval(intervalId);
      clearInterval(intervalId2);
      clearInterval(intervalId3);
      isIntervalRunning = false;
      isInterval2Running = false;
      isInterval3Running = false;
    }
  }
});

/* 
---------------------------------------------------------
 Chat Section for Users
---------------------------------------------------------
*/

client.on("message", (channel, tags, message, self) => {
  // Ignore messages from the bot itself
  if (self) return;

  // Help commands
  if (message === "!bothelp" && tags.mod) {
    client.say(
      channel,
      `@${tags.username}, Команды бота:
       !Ledit [add | del | edit] [!<Название команды>] [Текст команды](только для [add | edit])`
    );
  }

  if (message === "!bothelp2" && tags.mod) {
    client.say(
      channel,
      `@${tags.username}, Команды бота 2:
       !interval[2|3] [Текст команды] [Кол-во повторов] [От] [До] [Интервал в секундах]; 
       !endinterval[2|3](останавливает интервал); !clearintervals(останавливает все интервалы);
       `
    );
  }

  // Check if the message is the custom command

  // Convert message to lowercase
  let commandMessageToLowerCase = message.toLowerCase();
  if (commandMessageToLowerCase.startsWith("!")) {
    let cmdMessageStore = commandMessageToLowerCase.split(" ");
    let cmdMessageStorePartial = findCommandByPartialMatch(cmdMessageStore[0]);

    // Check if the command is valid(more than 2 characters)
    if (commandMessageToLowerCase === "!") return;
    if (tags.mod) return;
    // Execute the command
    if (cmdMessageStorePartial) {
      // Remove the command name from the message
      let cmdMessageStoreSplit = cmdMessageStorePartial.split(" ");
      cmdMessageStoreSplit.shift();
      let cmdMessage = cmdMessageStoreSplit.join(" ");

      // Send the message to the channel
      client.say(channel, `@${tags.username} ${cmdMessage}`);
    }
  }
});

client.on("message", (channel, tags, message, self) => {
  if (self || !message.startsWith("!")) return;

  if (message === "!test") {
    client.say(channel, `/announce ${message}`);
  }
});
