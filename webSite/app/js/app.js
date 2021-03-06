
// Namespace for Xiot framework specific stuff.
var XIOT = {};


XIOT.View = Backbone.View.extend({
  xiotSync: function(model) {
    Backbone.sync("update", model, {url:document.location.href + "api/data", headers:{"Xiot-forward-to": model.__ip}});
  }
  
}); 


$(document).ready(function() {
  $('body').append($('<div class="container-fluid" id="container"><h1>Iotinator</h1><div id="main"><div id="module-list" class="row"></div></div></div>'));
  
  // TODO: make this dynamic !
  loadjscssfile("switchUIClass");
  loadjscssfile("leakUIClass");
  loadjscssfile("xeniaUIClass");

  function loadjscssfile(filename) {
    console.log("Loading js and css for " + filename );
    filename = "/app/" + filename + "/module";
    tag = document.createElement('script');
    tag.setAttribute("type", "text/javascript");
    tag.setAttribute("async", "false");
    tag.setAttribute("src", filename + ".js");
    document.getElementsByTagName("head")[0].appendChild(tag);
    tag = document.createElement("link");
    tag.setAttribute("rel", "stylesheet");
    tag.setAttribute("type", "text/css");
    tag.setAttribute("href", filename + ".css");
    document.getElementsByTagName("head")[0].appendChild(tag);
  }
  
  let moduleModel = Backbone.Model.extend({
    defaults: function() {
      let model = {
        id: "",     // mandatory id
        name: "",     // Name of the module  (can change)
        type: "",     // type of the module  (cannot change)
        MAC: "",      // Mac address of the module transformed to be used as id
        ssid: "",     // Name of the created wifi network 
        ip: "",       // IP on the Access Point created wifi network
        uiClassName: "",       // uiClassName of the module
        heap: 0,
        canSleep: false,
        pong: false,
        alert: false,
        alertMsg: "",
        custom: {}
      };
      return model;
    },
    
    parse: function(data) {
      // any transformation ? no ? ok
      return data;
    }
    
  });
  let url = document.location.href.split('/');
  url.pop();
  url = url.join('/') + "/api/list";
  window.customData = {}; // data store for modules' data
  let cssJsLoaded = {};
  
  let moduleListModel = Backbone.Collection.extend({
    model: moduleModel,
    url: url,
    parse: function(data) {
      // The list API returs a hash, transform it to array
      let result = [];
      for(let attr in data) {
        let item = data[attr];
        item.id = 'M' + attr.replace(/:/g, "_");
        item.MAC = attr;
        // custom will be the data for the module model. Needs an id.
        try {
          item.custom = JSON.parse(item.custom);
        } catch(e) {
          item.custom = {};
        } finally {
          item.custom.id = item.id;
        }
        result.push(item);
        
        // try {
        //   window.customData[item.id] = item.custom ? JSON.parse(item.custom) : {};
        // } catch(e) {
        //   // some modules may have no custom data. They are useless, I guess...
        // }
        
        //The fist time we meet a new uiClassName Inject js and css for uiClassName ?
        // if(item.uiClassName && !cssJsLoaded[item.uiClassName]) {
        //   loadjscssfile(item.uiClassName);      // Too late, Ginette !
        //   cssJsLoaded[item.uiClassName] = true;
        // }
      }
      return result;
    }
  });
  
  let modules = new moduleListModel;
  window.modules = modules;    // help debug
  
  let moduleView = Backbone.View.extend({
    tagName: "div",
    template: _.template('\
<div class="moduleWrapper <%- uiClassName %> <%- alert %>" moduleId="<%- id %>">\
  <div class="name"><%- name %><div class="commands"><span class="icon icon-cog"/><span class="icon icon-loop2"/><span class="icon icon-floppy-disk"/></div></div>\
  <div class="moduleContent" id="content_<%- id %>"></div>\
  <hr/>\
  <div class="footer pong <%- pong %>"></div>\
  <div class="footer localIP"><%- ip %></div>\
</div>'),
    initialize: function () {
      this.listenTo(this.model, 'change', this.render);
      let jsonModel = this.model.toJSON();
      let moduleUIClass = jsonModel.uiClassName;
      if(moduleUIClass in window) {
        this.__moduleModel = new window[moduleUIClass].Model(jsonModel.custom);
        this.__moduleModel.url = function() {return "/api/data"};
        this.__moduleModel.__ip = jsonModel.ip;
        this.__moduleView = new window[moduleUIClass].View({model: this.__moduleModel, id: "content_" + jsonModel.custom.id});
      }
    },
    render: function () {
      let jsonModel = this.model.toJSON();
      this.$el.html(this.template(jsonModel));
      this.$el.addClass("col-xs-12 col-sm-4 col-md-4 col-lg-3");
      let moduleUIClass = jsonModel.uiClassName;
      if(moduleUIClass in window) {
        this.__moduleView.setElement(this.$el.find(".moduleContent").first());
        this.__moduleModel.set(jsonModel.custom);
        this.__moduleView.$el.html(this.__moduleView.template(this.__moduleModel.toJSON()));
      }
      
      return this;
    }
  });

  let AppView = Backbone.View.extend({
    el: $("#main"),
    initialize: function() {
      this.listenTo(modules, 'add', this.addOne);
      this.listenTo(modules, 'reset', this.addAll);
    },

    addOne: function(aModule) {
      let view = new moduleView({model: aModule, id: aModule.id});
      this.$("#module-list").append(view.render().el);
    },
    addAll: function() {
      this.$("#module-list").empty();
      modules.each(this.addOne, this);
    }
  });
  
  let app = new AppView({model: modules, id: "modules"});
  window.app = app;
  setInterval(fetch, 11000);
  fetch();

  function fetch() {
    if(!$('body').hasClass("editing")) {
      $('body').removeClass('fetchingError');
      $('body').addClass('fetching');
      app.model.fetch({
        reset: false,
        error: function(collection, response, options) {
          $('body').addClass('fetchingError');
          //debugger;
        },
        complete: function() {
          $('body').removeClass('fetching');
        }
      });
    }
  }  
});