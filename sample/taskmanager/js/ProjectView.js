/**
 * Component: ProjectView
 *
 * Responsibilities:
 *   - Manage a single project screen
 *   - Manage the task list of a project
 *
 */
(function($) {
	
	
	brite.registerView("ProjectView",{
		create: function(data){
			var view = this;
			return $.when(main.projectDao.get(data.projectId),main.taskDao.list({match:{projectId:data.projectId}})).pipe(function(project,taskList){
				view.project = project;
				view.projectId = data.projectId;
				return $("#tmpl-ProjectView").render({project:project,tasks:taskList});
			});			
		},
		
		postDisplay: function(){
			var view = this;
		 	// cache some fixed elements
		 	view.$card = view.$el.find(".card"); 
		 	view.$cardBack = view.$el.find(".card-back");
		 	view.$cardFront = view.$el.find(".card-front");		
		 	view.$sectionContent = view.$el.find("section.content"); 	
		},
		
		events: {
			
			// User click on "done" checkbox.
			"change; input[data-prop='done']" : function(event){
				var $check = $(event.currentTarget);
				// the object type and id are store in the DOM, so, just look for the parent element for this
				var taskId = $check.bEntity("Task").id;
				var done = $check.prop("checked");
				main.taskDao.update({id:taskId,done:done});
			},
			
			// User click on the delete icon
			"click; section.heading .del" : startDeleteMode,
			
			// Handle the task rename
			"focus; [data-entity='Task'] input[data-prop='title']": startTaskRename,
			"blur; [data-entity='Task'] input[data-prop='title']": endTaskRename,
			
			// Handle the create new task
			"focus; .newTask input[data-prop='title']": startTaskCreate,
			"blur; .newTask input[data-prop='title']": endTaskCreate,
			
			// Handle the edit project
			"btap; [data-action='editMode']": startProjectEdit,
			"ProjectEdit_DONE": endProjectEdit
			
		},
		
		daoEvents: {
			"dataChange; Task" : refreshTable, 
			
			"dataChange; Project" : function(event){
				var view = this;
				var daoEvent = event.daoEvent;
				// if it is the same Project, then, update it
				if (daoEvent.result && daoEvent.result.id === view.projectId){
					view.project = daoEvent.result;
					view.$el.find("header h2").text(view.project.title);
				}				
			}
		}
	});
	
	// --------- Event Handlers for Project Edit --------- //
	function startProjectEdit(){
		var view = this;
		console.log("projectId: " + view.projectId);
 		brite.display("ProjectEdit",view.$cardBack,{projectId:view.projectId}).done(function(){
 			view.$card.addClass("flipped");
 			
 			/* --------- for opera --------- */
 			$("body.is-opera .card-front").hide();
 			$("body.is-opera .card-back").show();
 			/* --------- /for opera --------- */
 		});		
	}
	
	function endProjectEdit(){
		var view = this;
	  	view.$card.removeClass("flipped");	
	  	
	  	/* --------- for opera --------- */
	  	$("body.is-opera .card-front").show();
		$("body.is-opera .card-back").hide();	
		/* --------- /for opera --------- */
	}
	// --------- /Event Handlers for Project Edit --------- //
	
	
	// --------- Event Handlers for Task Creation --------- //
	// start the task creation logic 
	// @param event.currentTarget must be the new task input element
	function startTaskCreate(event){
		var view = this;
		var $input = $(event.currentTarget);
		$input.off();
		
		$input.after(createHelperHtml);
		
		$input.on("keyup",function(event){
			// press ENTER
			if (event.which === 13){
				var newTask ={
					projectId: view.projectId,
					title: $input.val()
				}
				main.taskDao.create(newTask).done(function(){
					// Note: the DAO event listeners are triggered first, 
					//       since they are bound before the promise is returned.
					//       So, this is why, here the table will be refreshed, and we can set the new focus.  
					view.$el.find(".newTask input").focus();
				});
			}
			// press ESC
			else if (event.which === 27) {
				$input.trigger("blur");
			}
		});		
	}
	
	// End the task creation
	// @param event.currentTarget must be the new task input element
	function endTaskCreate(event){
		var $input = $(event.currentTarget);
		$input.val("");
		$input.parent().find(".helper").remove();
	}
	// --------- /Event Handlers for Task Creation --------- //	
	
	
	// --------- Event Handlers for Task Rename --------- //	
	// Starting the rename logic
	// @param event.currentTarget must be the task input element
	function startTaskRename(event){
		var view = this;
		var $input = $(event.currentTarget);
		$input.off();
		
		if (view.deleteMode){
			$input.trigger("blur");
			return;
		}
		
		var taskId = $input.bEntity("Task").id;
		
		$input.data("oldValue",$input.val());
		
		$input.after(updateHelperHtml);
		
		$input.on("keyup", function(event){
			// press ENTER
			if (event.which === 13){
				var taskData ={
					id: taskId,
					title: $input.val()
				}
				
				main.taskDao.update(taskData);
			}
			// press ESC
			else if (event.which === 27) {
				$input.trigger("blur");
			}				
		});		
	}
	
	// Ending the rename
	function endTaskRename(event){
		var $input = $(event.currentTarget);
		var oldValue = $input.data("oldValue");
		if (oldValue){
			$input.val($input.data("oldValue"));
		}
		$input.data("oldValue",null);
		$input.parent().find(".helper").remove();		
	}
	// --------- /Event Handlers for Task Rename --------- //
		
	// --------- Event Handlers for Tasks Remove --------- //	
	function startDeleteMode(event){
		var view = this;
		// create the delete-controls element
		var $controls = $($("#tmpl-ProjectView-delControls").render());
		
		view.$el.find("section.heading").append($controls);
		
		var $inner = $controls.find(".delete-controls-inner");
		
		setTimeout(function(){
			$inner.addClass("show");
		},10);
		
		// add the deleteMode class and set component flag
		var $tableContent = view.$el.find("section.content");
		$tableContent.addClass("deleteMode");
		view.deleteMode = true;
		
		// disable the inputs
		$tableContent.find("input").prop("disabled",true);
		
		// delete			
		var $deleteButton = $controls.find("[data-action='delete']");
		$deleteButton.on("click",function(){
			var ids = [];
			$tableContent.find("tr.to-delete").each(function(idx,tr){
				ids.push($(tr).bEntity("Task").id);
			});
			main.taskDao.removeMany(ids).done(function(){
				turnDeleteModeOff();
			});
		});
		
		// cancel
		$controls.on("click","[data-action='cancel']",function(){
			turnDeleteModeOff();
		});
		
		// toggle the to-delete state of a row
		// namespace the event binding for future cleanup
		$tableContent.on("click.seldelete","tr",function(){
			var $tr = $(this);
			$tr.toggleClass("to-delete");
			var num = $tableContent.find("tr.to-delete").length;
			$deleteButton.text("Delete (" + num + ")");
		});
		
		
		// define function in scope to reuse all context variables
		function turnDeleteModeOff(){
			$tableContent.removeClass("deleteMode");
			$tableContent.removeClass("deleteMode");
			$tableContent.find("tr.to-delete").removeClass("to-delete");
			view.deleteMode = false;
			
			// cleanup the event to make sure to not double bind it.
			$tableContent.off(".seldelete");
			
			// enable the input
			$tableContent.find("input").prop("disabled",false);
			
			$controls.find(".delete-controls-inner").removeClass("show").on("btransitionend",function(){
				$controls.remove();
			});
			
			/* --------- for opera and mozilla--------- */
			if($.browser.opera || $.browser.mozilla){
	  			$controls.find(".delete-controls-inner").removeClass("show")
				$controls.remove();
			}
			/* --------- /for opera and mozilla--------- */
		}		
	}
	
	// --------- Event Handlers for Tasks Remove --------- //
	
	// --------- Private Methods --------- //
	function refreshTable(){
		var view = this;
		
		return main.taskDao.list({match:{projectId:view.projectId}}).done(function(taskList){
			var taskTableHtml = $("#tmpl-ProjectView-taskList").render({tasks:taskList});
			view.$sectionContent.html(taskTableHtml);			
		});
	}
	// --------- /Private Methods --------- //
	
	var createHelperHtml = '<small class="helper">Press [ENTER] to create, or [ESC] to cancel.</small>';
	var updateHelperHtml = '<small class="helper">Press [ENTER] to update, or [ESC] to cancel.</small>';

})(jQuery); 