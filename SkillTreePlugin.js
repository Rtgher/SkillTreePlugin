/*:
 * @plugindesc Adds a tree-like dependency to skills, along with a window to see the skills.
 * @author RtGherman
 *
 * @param KnowledgeTreeWindowName
 * @text New Window Name
 * @desc Use this parameter to customize the name of the new window created.
 * @type number
 * @min 0
 * @default 10
 *
 * @help
 * This plugin will add a pre-requisite to your skills.
 * You can define pre-requisites for a skill in the 'Note' section of your skill window.
 * To do so, you need to go into your skills window, in the RPG Maker resource manager,
 * select your skill, and add the pre-requisites in the following format within the Note section:
 * <Prerequisites: 1, 2>
 */

var SkillTree = SkillTree || {}
var KnowledgeTreeWindowName = 'Spellbook' // Variable to hold the window name

;(function () {
  // Hook into Scene_Boot's start method to ensure the game data is fully loaded
  var _Scene_Boot_start = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function () {
    _Scene_Boot_start.call(this);
    StartPlugin()
  }
  CreateMenuCommand()
  CreateMenuCommandHandler()

})()

// Extend the menu command window to include the KnowledgeTree option
function CreateMenuCommand() {
    var _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        _Window_MenuCommand_addOriginalCommands.call(this);
        this.addCommand(KnowledgeTreeWindowName, 'knowledgeTree', this.areMainCommandsEnabled());
    };
}

// Override createCommandWindow to add the handler for the new command
function CreateMenuCommandHandler(){
    var _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler('knowledgeTree', this.commandKnowledgeTree.bind(this));
    };
    // Define the handler function to call the new scene
    Scene_Menu.prototype.commandKnowledgeTree = function() {
        SceneManager.push(Scene_KnowledgeTree);
    };
}

function StartPlugin () {
  var parameters = PluginManager.parameters('MyCustomPlugin')

  SetUpSkillTree(SkillTree)

  // Plugin functionality
  // Example: Add a command to the menu
  var _Scene_Menu_create = Scene_Menu.prototype.create
  Scene_Menu.prototype.create = function () {
    _Scene_Menu_create.call(this)
  }
}

function SetUpSkillTree (SkillTree) {
  SkillTree.prerequisites = {}

  $dataSkills.forEach(function (skill) {
    if (skill && skill.note) {
      var match = skill.note.match(/<Prerequisites:\s*(.+)>/i)
      if (match) {
        var prereqList = match[1].split(',').map(Number)
        SkillTree.prerequisites[skill.id] = prereqList
      }
    }
  })
}

/*
 * Knowledge Tree Window
 */
function Window_KnowledgeTree () {
  this.initialize.apply(this, arguments)
}

Window_KnowledgeTree.prototype = Object.create(Window_Base.prototype)
Window_KnowledgeTree.prototype.constructor = Window_KnowledgeTree

Window_KnowledgeTree.prototype.initialize = function (x, y, width, height) {
  Window_Base.prototype.initialize.call(this, x, y, width, height)
  this._actor = null // The actor whose skills are displayed
  this.refresh()
  this.createBackButton();
}

Window_KnowledgeTree.prototype.setActor = function (actor) {
  if (this._actor !== actor) {
    this._actor = actor
    this.refresh()
  }
}

Window_KnowledgeTree.prototype.refresh = function () {
  this.contents.clear()
  if (this._actor) {
    this.drawKnowledgeTree()
  }
}

Window_KnowledgeTree.prototype.drawKnowledgeTree = function () {
  var skills = this._actor.skills()
  var y = 0

  for (var i = 0; i < skills.length; i++) {
    var skill = skills[i]
    var skillId = skill.id
    var prerequisites = SkillTree.prerequisites[skillId] || []
    var skillName = skill.name

    var prereqNames = prerequisites
      .map(function (prereqId) {
        var prereqSkill = $dataSkills[prereqId]
        return prereqSkill ? prereqSkill.name : ''
      })
      .join(', ')

    var text = skillName + ' (' + prereqNames + ')'
    this.drawText(text, 0, y, this.contents.width, 'left')
    y += this.lineHeight()
  }
}

Window_KnowledgeTree.prototype.createBackButton = function() {
    this._backButton = new Sprite_Button();
    this._backButton.bitmap = new Bitmap(200, 48); // Set button size
    this._backButton.bitmap.drawText('Back', 0, 0, 200, 48, 'center'); // Draw "Back" text
    this._backButton.x = Graphics.boxWidth - 220; // Positioning
    this._backButton.y = Graphics.boxHeight - 60; // Positioning
    this._backButton.setClickHandler(this.onBackButton.bind(this)); // Set the click handler
    this.addChild(this._backButton); // Add the button to the window
};

Window_KnowledgeTree.prototype.onBackButton = function() {
    SoundManager.playCancel();
    SceneManager.pop(); // Go back to the previous scene (main menu)
};

Window_KnowledgeTree.prototype.processCancel = function() {
    SoundManager.playCancel();
    this.onBackButton(); // Trigger the back button functionality
};

/*
 * Scene Integration
 */

var _Scene_Skill_create = Scene_Skill.prototype.create
Scene_Skill.prototype.create = function () {
  _Scene_Skill_create.call(this)
  this.createKnowledgeTreeWindow()
  this.refreshActor()
}

Scene_Skill.prototype.createKnowledgeTreeWindow = function () {
  var wx = 0
  var wy = this._helpWindow.height
  var ww = Graphics.boxWidth
  var wh = Graphics.boxHeight - wy
  this._knowledgeTreeWindow = new Window_KnowledgeTree(wx, wy, ww, wh)
  this.addWindow(this._knowledgeTreeWindow)
}

Scene_Skill.prototype.refreshActor = function () {
  var actor = this.actor()
  this._knowledgeTreeWindow.setActor(actor)
}

/*
 * Skill Learning
 */
;(function () {
  var _Game_Actor_learnSkill = Game_Actor.prototype.learnSkill
  Game_Actor.prototype.learnSkill = function (skillId) {
    if (this.canLearnSkill(skillId)) {
      _Game_Actor_learnSkill.call(this, skillId)
    }
  }

  Game_Actor.prototype.canLearnSkill = function (skillId) {
    var prerequisites = SkillTree.prerequisites[skillId]
    if (!prerequisites) return true // No prerequisites, can learn directly
    return prerequisites.every(function (prerequisiteId) {
      return this.isLearnedSkill(prerequisiteId)
    }, this)
  }
})()

/*
 * Scene Knowledge Tree
 */
function Scene_KnowledgeTree() {
    this.initialize.apply(this, arguments);
}

Scene_KnowledgeTree.prototype = Object.create(Scene_MenuBase.prototype);
Scene_KnowledgeTree.prototype.constructor = Scene_KnowledgeTree;

Scene_KnowledgeTree.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_KnowledgeTree.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this._knowledgeTreeWindow = new Window_KnowledgeTree(0, 0, Graphics.boxWidth, Graphics.boxHeight);
    this._knowledgeTreeWindow.setActor($gameParty.menuActor());
    this.addWindow(this._knowledgeTreeWindow);
};

// Handle ESC key press (cancel)
Scene_KnowledgeTree.prototype.update = function() {
    Scene_MenuBase.prototype.update.call(this);
    if (Input.isTriggered('cancel') || TouchInput.isCancelled()) {
        this.popScene(); // Go back to the previous scene (main menu)
    }
};