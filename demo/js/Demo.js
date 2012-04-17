(function(){
  
  // --------- Component Interface Implementation ---------- //
  function Demo(){
    
  }
  // --------- /Component Interface Implementation ---------- //
  
  
  Demo.prototype.create = function(){
    var html = $("#tmpl-Demo").render({});
    return $(html);
  }
  
  Demo.prototype.postDisplay = function(){
    var c = this; 
    
    // display the dock
    brite.display("Dock",null,{parent:c.$element});
    
    
  }
  
  // --------- Component Registration --------- //
  brite.registerComponent("Demo", {
    parent : "body",
    loadTemplate : true
  },
  // Note in this way, when a function is passed, this function will be use as the factory for the new instance it is responsible to return an instance of the Component
  function() {
    return new Demo();
  });
  // --------- /Component Registration --------- //  
  
})();