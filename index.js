var accountSid = 'AC2a4b35b8f980d53867c6fd33c7df4cc7';
var authToken = 'c14bba35b7b5f470c8e583ba76264f96';

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username, phone) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    socket.phone = phone;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  //Send SMS from Twilio
  socket.on('send sms', function (data) {
    client.messages.create({
        body: data.message,            //SMS text
        to: data.phone,
        from: '+16176525539 ' // Twilio Number
    }, function(err, message) {
        if (err)
            console.log(err);
        else {
            console.log('Message Sent')
        }
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        phone: socket.phone,
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
