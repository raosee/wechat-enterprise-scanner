var express = require("express.oi");
var app = express();
var fs = require('fs');
var config = require('./config/config.json');
var corp = config.corp;
app.http().io();
app.io.set('transports', ['websocket']);

var _API = require('wechat-enterprise-api');
var API = new _API(corp.corpid, corp.secret, '6');

API.getAccessToken(function(err, token) {
	console.log(err, token);
});



var wx = app.io.of('wx');

var redirect_uri = 'http://common.bozhong.com/cms/content.html?type=page&id=54f50c09a3c3b1c21d8b456e';

wx.on('connection', function(socket) {
	socket.on('wx:qrcode:give_me_code', function() {
		// generate 'wx_'+uuid for identify
		var uuid = require('node-uuid').v4();
		socket.join('wx:' + uuid);
		//var backUrl = 'http://' + config.site.domain + '/oauth/wechat?uuid=' + uuid;
		//var url = client.getAuthorizeURL('http://common.bozhong.com/cms/content.html?type=page&id=54f50c09a3c3b1c21d8b456e&redirect_uri=' + encodeURIComponent(backUrl), 'bozhong', 'snsapi_userinfo');
		var codeUrl = 'http://' + config.site.domain + '/oauth/wechat/checkcode?uuid=' + uuid;
		var url = 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=' + corp.corpid + '&redirect_uri=' + encodeURIComponent('http://common.bozhong.com/cms/content.html?type=page&id=54f50c09a3c3b1c21d8b456e&redirect_uri=' + encodeURIComponent(codeUrl)) + '&response_type=' + 'code' + '&scope=' + 'snsapi_base' + '&state=' + 'hello' + '#wechat_redirect';
		socket.emit('wx:qrcode:got', 'http://' + config.site.domain + '/oauth/wechat/redirect?uuid=' + uuid + '&url=' + encodeURIComponent(url));
	});
});

// scan check
app.get('/oauth/wechat/redirect', function(req, res, next) {
	var uuid = req.query.uuid;
	wx.to('wx:' + uuid).emit('wx:scan:success', req.user);
	res.redirect(req.query.url);
});

app.get('/oauth/wechat/checkcode', function(req, res, next) {
	var uuid = req.query.uuid;
	var code = req.query.code;
	//res.send(uuid + ' ' + code);

	API.getUserIdByCode(code, function(err, user) {
		console.log(err);

		API.send({
			touser: user.UserId
		}, {
			"msgtype": "text",
			"text": {
				"content": "登录提醒：你刚刚通过微信登录了播种网OA系统"
			},
			"safe": "0"
		}, function(err, a) {
			console.log(err, a);
		});


		API.getUser(user.UserId, function(err, user) {
			//console.log(err,user);
			wx.to('wx:' + uuid).emit('wx:auth:success', user);
			res.send(user);
		});

		//res.send(user);
	});

});

app.get('/connect', function(req, res, next) {
	res.send(fs.readFileSync('./connect.html').toString());
});

// body parser
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));


module.exports = function(option) {
	app.listen(option.port);
};