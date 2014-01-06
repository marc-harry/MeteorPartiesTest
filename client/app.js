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
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
      }
      this.render('page');
    }
  });

  this.route('chat', {
    path: '/Chat',
    template: 'chat',
    before: function () {
      if(!Meteor.user()) {
        this.router.go("home");
        alert("Please login to use chat.");
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

function success(position) {
  Session.set("userPosition", new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
  map.panTo(new google.maps.LatLng(Session.get("userPosition").nb, Session.get("userPosition").ob));
}

function error(msg) {
  Session.set("userPosition", new google.maps.LatLng(0, 0));
}