Router.configure({
  layoutTemplate: 'layout'
});

Router.map(function () {
  /**
   * The route's name is "home"
   * The route's template is also "home"
   * The default action will render the home template
   */
  this.route('home', {
    path: '/',
    action: function () {
      Session.set("activeBootTab", "home");
      document.title = "Home";
      this.render('page');
    }
  });

  this.route('chat', {
    path: '/Chat',
    template: 'chat',
    before: function () {
      if(!Meteor.user()) {
        this.router.go("home");
        this.stop();
      }
    },
    action: function () {
      Session.set("activeBootTab", "chat");
      document.title = "Chat";
      this.render('chat');
    }
  });
});