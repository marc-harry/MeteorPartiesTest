// All Tomorrow's Parties -- server

Meteor.publish("directory", function () {
  return Meteor.users.find({}, {fields: {emails: 1, profile: 1, status: 1, username: 1}});
});

Meteor.publish("parties", function () {
  return Parties.find(
    {$or: [{"public": true}, {invited: this.userId}, {owner: this.userId}]});
});

Meteor.publish("chats", function () {
	return Chats.find();
});

Accounts.validateNewUser(function (user) {
	if(user.username == undefined) {
		if(user.services.github) {
			user.username = user.services.github.username;
			user.profile.name = user.services.github.username;
		}
	}
  
  if (user.username && user.username.length >= 3)
    return true;
  throw new Meteor.Error(403, "Username must have at least 3 characters");
});