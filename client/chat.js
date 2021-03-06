///////////////////////////////////////////////////////////////////////////////
// Chat Page

Template.chat.created = function () {
	Session.set("chatUser", "You");
};

Template.chat.messages = function () {
	var selectedUser = Session.get("chatUser");
	var id = null;
	if(selectedUser == "You") {
		id = Meteor.userId();
	} else {
		id = Meteor.users.findOne({ username: selectedUser })._id;
	}

	var resultMessages = [];
	var listOfMessages = Chats.find({ owner: Meteor.userId(), sentTo: id }, { sort: { date: -1 }}).fetch();
	if(id != Meteor.userId()) {
		var otherMessage = Chats.find({ owner: id, sentTo: Meteor.userId() }, { sort: { date: -1 }}).fetch();
		resultMessages = listOfMessages.concat(otherMessage);
		resultMessages.sort(function (a,b) {
			return parseFloat(a.date) - parseFloat(b.date)
		});
	} else {
		resultMessages = listOfMessages;
	}

	return resultMessages;
};

Template.chat.activeChatUser = function () {
	return Session.get("chatUser");
};

Template.chat.loggedInUsers = function () {
	return Meteor.users.find( { username: { $ne: Meteor.user().username } }, { sort: { username: 1 } } );
};

Template.chat.events({
	'click #sendmessage': function (event, template) {
		var message = template.find("#message").value;
		var user = template.find(".active").id.replace('chatTab', '');
		var userId = null;
		if(user == "You") {
			userId = Meteor.userId();
		}
		else {
			userId = Meteor.users.findOne({ username: user })._id;
		}

		if(message.length && userId.length) {
			var id = createMessage({
				message: message,
				date: new Date().getTime(),
				sentTo: userId
			});

			if(id) {
				template.find("#message").value = "";
				var listMessages = $(".chat li");
				listMessages.focus(listMessages.length);
			}
		}

		markSeen({ 
			sentTo: Meteor.userId(), 
			sentFrom: userId
		});

		// Meteor.setTimeout(function () { template.find("#discussion li:last").focus() }, 100);
	},

	'click li a': function (event, template) {
		event.preventDefault();
		var name = event.currentTarget.innerText;
		if(event.currentTarget.childNodes.length == 2) {
			name = event.currentTarget.childNodes[1].nodeValue;
		}
		Session.set("chatUser", name);
		if (!$('#chatTab' + name).length) {
	        var height = $('#chatContainer').height() - 140;
	        $('.nav-tabs').append('<li id="chatTab' + name + '"><a href="#' + name + '" data-toggle="tab"><button type="button" class="close" aria-hidden="true"> &times\;</button>' + name + '</a></li>');
	        //$('#activeChatsContent').append('<div class="tab-pane" id="' + name + '"><ul style="padding-top:5px; overflow-y:scroll; height: ' + height + ';" id="discussion-' + name + '">{{#each messages '+ name +'}}{{> message}}{{/each}}</ul></div>');
	        
	        $('#chatTab' + name + ' a[href="#' + name + '"]').tab('show');   
	    } else {
	        $('#chatTab' + name + ' a[href="#' + name + '"]').tab('show');
	    }

	    if(name != "You") {
	    	markSeen({ 
				sentTo: Meteor.userId(), 
				sentFrom: Meteor.users.findOne({ username: name })._id
			});
	    }

	    // Meteor.setTimeout(function () { template.find("#discussion li:last").focus() }, 100);
	},

	'click .close': function (event, template) {
		event.preventDefault();
		var name = event.currentTarget.innerText;
		if(event.currentTarget.parentElement.childNodes.length == 2) {
			name = event.currentTarget.parentElement.childNodes[1].nodeValue;
		}
		var isActiveTab = Session.get("chatUser") == name ? true : false;

		var controlName = '#chatTab' + name;

		if(isActiveTab) {
		    var index = $('#activeChats > ul > li').index($(controlName)) - 1;
		    $(controlName).remove();
		    $('#activeChats li a:eq(' + Number(index) + ')').tab('show');
		    var newName = $(".nav-tabs .active a").text();
		    if(newName == "You") {
		    	newName = Meteor.user().username;
		    } else {
		    	newName = newName.replace(newName.substring(0, 2), "");
		    }
		    Session.set("chatUser", newName);
		} else {
			$(controlName).remove();
		}
	}
});

Template.message.helpers({
	formattedDate: function () {
		return moment(this.date).format("hh:mmA D/M/YY");
	},
	meOrYou: function () {
		return Meteor.userId() == this.owner ? "/ME.gif" : "/You.gif";
	},
	displayChatName: function () {
		return Meteor.userId() == this.owner ? Meteor.user().username : Meteor.users.findOne({ _id: this.owner }).username;
	}
});

Template.onlineUsers.helpers({
	messagesUnseen: function () {
		var num = Chats.find({ owner: this._id, sentTo: Meteor.userId(), seen: false }, { sort: { date: 1 }}).count();
		return num == 0 ? "" : num;
	}
});

String.format = function (format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
    });
};