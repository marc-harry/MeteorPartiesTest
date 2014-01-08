// All Tomorrow's Parties -- client

Meteor.subscribe("directory");
Meteor.subscribe("parties");
Meteor.subscribe("chats");

// If no party selected, or if the selected party was deleted, select one.
Meteor.startup(function () {
  Deps.autorun(function () {
    var selected = Session.get("selected");
    if (! selected || ! Parties.findOne(selected)) {
      var party = Parties.findOne();
      if (party)
        Session.set("selected", party._id);
      else
        Session.set("selected", null);
    }
  });
});

Accounts.ui.config({
  passwordSignupFields: "USERNAME_AND_EMAIL"
});

///////////////////////////////////////////////////////////////////////////////
// Party details sidebar

Template.details.party = function () {
  return Parties.findOne(Session.get("selected"));
};

Template.details.anyParties = function () {
  return Parties.find().count() > 0;
};

Template.details.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if (owner._id === Meteor.userId())
    return "me";
  return displayName(owner);
};

Template.details.canRemove = function () {
  return this.owner === Meteor.userId() && attending(this) === 0;
};

Template.details.maybeChosen = function (what) {
  var myRsvp = _.find(this.rsvps, function (r) {
    return r.user === Meteor.userId();
  }) || {};

  return what == myRsvp.rsvp ? "chosen btn-inverse" : "";
};

Template.details.events({
  'click .rsvp_yes': function () {
    Meteor.call("rsvp", Session.get("selected"), "yes");
    return false;
  },
  'click .rsvp_maybe': function () {
    Meteor.call("rsvp", Session.get("selected"), "maybe");
    return false;
  },
  'click .rsvp_no': function () {
    Meteor.call("rsvp", Session.get("selected"), "no");
    return false;
  },
  'click .invite': function () {
    openInviteDialog();
    return false;
  },
  'click .remove': function () {
    Parties.remove(this._id);
    return false;
  }
});

///////////////////////////////////////////////////////////////////////////////
// Party attendance widget

Template.attendance.rsvpName = function () {
  var user = Meteor.users.findOne(this.user);
  return displayName(user);
};

Template.attendance.outstandingInvitations = function () {
  var party = Parties.findOne(this._id);
  return Meteor.users.find({$and: [
    {_id: {$in: party.invited}}, // they're invited
    {_id: {$nin: _.pluck(party.rsvps, 'user')}} // but haven't RSVP'd
  ]});
};

Template.attendance.invitationName = function () {
  return displayName(this);
};

Template.attendance.rsvpIs = function (what) {
  return this.rsvp === what;
};

Template.attendance.nobody = function () {
  return ! this.public && (this.rsvps.length + this.invited.length === 0);
};

Template.attendance.canInvite = function () {
  return ! this.public && this.owner === Meteor.userId();
};

///////////////////////////////////////////////////////////////////////////////
// Map display

// Use jquery to get the position clicked relative to the map element.
var coordsRelativeToElement = function (element, event) {
  var offset = $(element).offset();
  var x = event.pageX - offset.left;
  var y = event.pageY - offset.top;
  return { x: x, y: y };
};

Template.mapNew.rendered = function () {
  var latLong;
  if (!_.isUndefined(Session.get("userPositionLat")) && !_.isUndefined(Session.get("userPositionLong"))) {
    latLong = new google.maps.LatLng(Session.get("userPositionLat"), Session.get("userPositionLong"));
  } else {
    latLong = new google.maps.LatLng(51.621534, -3.943541);
  }
  var mapOptions = {
    disableDoubleClickZoom: true,
    zoom: 14,
    center: latLong
  };

  map = new google.maps.Map(document.getElementById('map-canvas'),
      mapOptions);

  google.maps.event.addListener(map, 'dblclick', function(e) {
    placeMarker(e.latLng, map);
  });
};

function placeMarker(position, map) {
  var marker = new google.maps.Marker({
    position: position,
    map: map
  });
}

/**

Template.map.events({
  'mousedown circle, mousedown text': function (event, template) {
    Session.set("selected", event.currentTarget.id);
  },
  'dblclick .map': function (event, template) {
    if (! Meteor.userId()) // must be logged in to create events
      return;
    var coords = coordsRelativeToElement(event.currentTarget, event);
    openCreateDialog(coords.x / 500, coords.y / 500);
  }
});

Template.map.rendered = function () {
  var self = this;
  self.node = self.find("svg");

  if (! self.handle) {
    self.handle = Deps.autorun(function () {
      var selected = Session.get('selected');
      var selectedParty = selected && Parties.findOne(selected);
      var radius = function (party) {
        return 10 + Math.sqrt(attending(party)) * 10;
      };

      // Draw a circle for each party
      var updateCircles = function (group) {
        group.attr("id", function (party) { return party._id; })
        .attr("cx", function (party) { return party.x * 500; })
        .attr("cy", function (party) { return party.y * 500; })
        .attr("r", radius)
        .attr("class", function (party) {
          return party.public ? "public" : "private";
        })
        .style('opacity', function (party) {
          return selected === party._id ? 1 : 0.6;
        });
      };

      var circles = d3.select(self.node).select(".circles").selectAll("circle")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateCircles(circles.enter().append("circle"));
      updateCircles(circles.transition().duration(250).ease("cubic-out"));
      circles.exit().transition().duration(250).attr("r", 0).remove();

      // Label each with the current attendance count
      var updateLabels = function (group) {
        group.attr("id", function (party) { return party._id; })
        .text(function (party) {return attending(party) || '';})
        .attr("x", function (party) { return party.x * 500; })
        .attr("y", function (party) { return party.y * 500 + radius(party)/2 })
        .style('font-size', function (party) {
          return radius(party) * 1.25 + "px";
        });
      };

      var labels = d3.select(self.node).select(".labels").selectAll("text")
        .data(Parties.find().fetch(), function (party) { return party._id; });

      updateLabels(labels.enter().append("text"));
      updateLabels(labels.transition().duration(250).ease("cubic-out"));
      labels.exit().remove();

      // Draw a dashed circle around the currently selected party, if any
      var callout = d3.select(self.node).select("circle.callout")
        .transition().duration(250).ease("cubic-out");
      if (selectedParty)
        callout.attr("cx", selectedParty.x * 500)
        .attr("cy", selectedParty.y * 500)
        .attr("r", radius(selectedParty) + 10)
        .attr("class", "callout")
        .attr("display", '');
      else
        callout.attr("display", 'none');
    });
  }
};

Template.map.destroyed = function () {
  this.handle && this.handle.stop();
};

*/

///////////////////////////////////////////////////////////////////////////////
// Create Party dialog

var openCreateDialog = function (x, y) {
  Session.set("createCoords", {x: x, y: y});
  Session.set("createError", null);
  Session.set("showCreateDialog", true);
  $('.modal').modal('show');
};

Template.page.showCreateDialog = function () {
  return Session.get("showCreateDialog");
};

Template.page.showInviteAlert = function () {
  var parties = Parties.find({ invited: Meteor.userId(), "rsvps.user": {$nin: [Meteor.userId()]} });
  if (parties) {
    return true;
  } else {
    return false;
  }
  //return Session.get("showInviteAlert");
};



Template.createDialog.events({
  'click .save': function (event, template) {
    var title = template.find(".title").value;
    var description = template.find(".description").value;
    var public = ! template.find(".private").checked;
    var coords = Session.get("createCoords");

    if (title.length && description.length) {
      var id = createParty({
        title: title,
        description: description,
        x: coords.x,
        y: coords.y,
        public: public
      });

      Session.set("selected", id);
      if (! public && Meteor.users.find().count() > 1)
        openInviteDialog();
      $('.modal-backdrop').remove();
      Session.set("showCreateDialog", false);
    } else {
      Session.set("createError",
                  "It needs a title and a description, or why bother?");
    }
  },

  'click .cancel': function () {
    Session.set("showCreateDialog", false);
  },

  'click .close': function () {
    Session.set("showCreateDialog", false);
  }
});

Template.createDialog.rendered = function () {
  $('.modal').modal('show');
};

Template.createDialog.error = function () {
    return Session.get("createError");
};

///////////////////////////////////////////////////////////////////////////////
// Invite dialog

var openInviteDialog = function () {
  Session.set("showInviteDialog", true);
  $('.modal').modal('show');
};

Template.page.showInviteDialog = function () {
  return Session.get("showInviteDialog");
};

Template.inviteDialog.events({
  'click .invite': function (event, template) {
    Meteor.call('invite', Session.get("selected"), this._id);
  },
  'click .done': function (event, template) {
    $('.modal-backdrop').remove();
    Session.set("showInviteDialog", false);
    return false;
  }
});

Template.inviteDialog.uninvited = function () {
  var party = Parties.findOne(Session.get("selected"));
  if (! party)
    return []; // party hasn't loaded yet
  return Meteor.users.find({$nor: [{_id: {$in: party.invited}},
                                   {_id: party.owner}]});
};

Template.inviteDialog.displayName = function () {
  return displayName(this);
};

Template.inviteDialog.rendered = function () {
  $('.modal').modal('show');
};

///////////////////////////////////////////////////////////////////////////////
// Invite Alert

Template.inviteAlerts.partyName = function () {
  return this.title;
};

Template.inviteAlerts.events({
  'click .rsvpInvite': function (event, template) {
    Session.set("selected", this._id);
  }
});

Template.inviteAlerts.inviteRequest = function() {
  return Parties.find({ invited: Meteor.userId(), "rsvps.user": { $ne: Meteor.userId() } });
};

///////////////////////////////////////////////////////////////////////////////
// Navbar Actions

Template.layout.partyAlerts = function () {
  var partyCount = Parties.find({ invited: Meteor.userId(), "rsvps.user": { $ne: Meteor.userId() } }).count();
  return partyCount == 0 ? '' : partyCount;
};

Template.layout.activeBootTab = function (route) {
  return Session.get("activeBootTab") == route ? "active" : "";
}

///////////////////////////////////////////////////////////////////////////////
// Footer Template

Template.footerSection.rendered = function () {
  var map_canvas = document.getElementById('map_canvas');

  var mapOptions = {
      center: new google.maps.LatLng(51.621534, -3.943541),
      zoom: 14,
      mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  
  var map = new google.maps.Map(map_canvas, mapOptions);
};