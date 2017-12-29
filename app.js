var express = require("express");
var google = require("googleapis");
var gmailApiSync = require('gmail-api-sync');
var googleapis = require('googleapis');
var parse = require('parse-gmail-email');
var base64url = require('base64url');
//var notifier = require('gmail-notifier');
var notifier = require('mail-notifier');
var AWS = require('aws-sdk');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');
var path = require('path');
var base64ImageToFile = require('base64image-to-file');

// Create a new AWS Polly object


//AWS Config 설정
AWS.config.loadFromPath('./awscreds.json');
AWS.config.update({region:'us-east-1'});
var polly = new AWS.Polly();
var rekognition = new AWS.Rekognition();
app.use(express.static(path.join(__dirname, 'static')));
var io_socket;


//HTTP 서버 포트 설정
server.listen(3001);

io.on('connection', function(socket) {
    //socket.emit('announcements', { message: 'A new user has joined!' });
});

console.log(io_socket);

//AWS AI 서비스 요청에 필요한 파라메터
var polly_params = {
    OutputFormat: 'mp3',
    VoiceId: 'Joanna',
}
var rekog_parmas = {
    Image: {
        Bytes : ""
    },
    MaxLabels: 1,
};

var msg_mail = {
    message : 'New Email Is Arrived',
    from : "",
    subject : "",
    content : "",
    attachment : "",
    test : 'test'
};


//imap 접속 정보 설정
var imap = {
    user: "kjc8397@gmail.com",
    password: "rnjs6625",
    host: "imap.gmail.com",
    port: 993, // imap port
    tls: true,// use secure connection
    tlsOptions: { rejectUnauthorized: false }
};


var _this = this;
notifier(imap).on('mail',function(message){
    // var mail_sender = mail.heders.from;
    // var mail_subject = mail.heders.subject;

    //메일의 정보를 파싱
    var mail = JSON.parse(JSON.stringify(message));
    var mail_content = mail.text; //메일의 내용
    var mail_from = mail.headers.from; //메일의 송신자
    var mail_subject = mail.headers.subject; //메일의 제목
    var mail_attachment = mail.attachments[0].content.data; //첨부파일
    var base64Data = mail_attachment;
    console.log(message);
    console.log(mail_content);
    console.log(mail_from);
    console.log(mail_subject);
    console.log(mail_attachment);
    rekog_parmas.Image.Bytes = new Buffer(base64Data, "base64");

    set_mailContent (mail_from, mail_subject, mail_content);

    rekognition.detectLabels(rekog_parmas, function(err, data) {
        if (err){
            console.log(err, err.stack); // an error occurred
        }
        else{
            console.log(data.Labels[0].Name); // successful response
            get_msg_mail().attachment= data.Labels[0].Name;
            console.log(data.Labels[0].Confidence); // successful response

            polly_params.Text = set_message();

            polly.synthesizeSpeech(polly_params, (err, data) => {
                if (err) {
                    console.log(err.code)
                } else if (data) {
                    if (data.AudioStream instanceof Buffer) {
                        fs.writeFile("./static/speech.mp3", data.AudioStream, function(err) {
                            if (err) {
                                return console.log(err)
                            }
                            console.log("The file was saved!")
                            io.sockets.emit('announcements', get_msg_mail());
                        })
                    }

                }
            })
        }
    });
}).start();

function set_mailContent (from, subject, content){
    msg_mail.from = from;
    msg_mail.subject = subject;
    msg_mail.content = content;
}

function set_mailAttachContent (attach_content){
    msg_mail.attachment = attach_content;
}

function get_msg_mail () {
    return msg_mail;
}



var OAuth2 = google.auth.OAuth2;

var oauth2Client = new OAuth2("1041876129147-mc9fnslmkn1nk11k5jqjlh6c0754268p.apps.googleusercontent.com","DGh7J5iw3n-nb-vJb-pwrfOu","http://localhost:3001/oauthcallback");

// generate a url that asks permissions for Google+ and Google Calendar scopes
var scopes = [
    'https://mail.google.com/'
];

var url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
    scope: scopes // If you only need one scope you can pass it as string
});

app.get('/', function(req, res){
    res.sendfile('index.html');
});

app.get("/url", function(req, res) {
    res.send(url);
});

app.get("/mailreader", function(req, res) {
    res.sendFile(__dirname + '/static/view_mail_reader.html');
});

app.get("/tokens", function(req, res) {
    var code = req.query.code;
    console.log(code);
    oauth2Client.getToken(code, function(err, tokens) {
        if (err) {
            console.log(err);
            res.send(err);
            return;
        }
        console.log(err);
        oauth2Client.setCredentials(tokens);

        console.log(tokens);
        console.log(oauth2Client);
        res.send(tokens);
    });
});

function set_message(){
    var msg_arrive = "New email is arrived!";
    var msg_subject = ", The Subject is" +  msg_mail.subject;
    var msg_content = ", The Content is" + msg_mail.content;
    var msg = msg_arrive + msg_subject +msg_content ;
    return msg;
}
