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
var ButtonBorderColor = '#FFFFFF';

var buttonWidth = 200;
var buttonHeight = 48;

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
  this._selectedSkill = null; // Currently selected skill
  this._focusedColumn = 0; // 0: Actor, 1: Skills, 2: Prerequisites
  this._actorIndex = 0;
  this._skillIndex = 0;
  this.createBackButton();
  this.createActorColumn(); // Initialize the actor selection column
}

Window_KnowledgeTree.prototype.setActor = function (actor) {
  if (this._actor !== actor) {
    this._actor = actor
    this.refresh()
  }
}

Window_KnowledgeTree.prototype.refresh = function() {
    this.refreshActorColumn(); // Refresh actor buttons
    this.refreshSkillsColumn(); // Clear skill buttons
    this.refreshPrerequisitesColumn(); // Clear prerequisite texts
};

Window_KnowledgeTree.prototype.createBackButton = function() {
    this._backButton = new Sprite_Button();
    this._backButton.bitmap = new Bitmap(buttonWidth, buttonHeight); // Set button size
    this._backButton.bitmap.drawText('Back', 0, 0, buttonWidth, buttonHeight, 'center'); // Draw "Back" text

    // Draw border
    this._backButton.bitmap.fillRect(0, 0, buttonWidth, 2, ButtonBorderColor); // Top border
    this._backButton.bitmap.fillRect(0, 46, buttonWidth, 2, ButtonBorderColor); // Bottom border
    this._backButton.bitmap.fillRect(0, 0, 2, buttonHeight, ButtonBorderColor); // Left border
    this._backButton.bitmap.fillRect(198, 0, 2, buttonHeight, ButtonBorderColor); // Right border
    
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

/**
 * Button Movement code:
 */
 Window_KnowledgeTree.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    this.processHandling();
    this.updateFocus();
};

Window_KnowledgeTree.prototype.processHandling = function() {
    if (Input.isTriggered('down') || Input.isTriggered('s')) {
        this.moveFocus(1);
    } else if (Input.isTriggered('up') || Input.isTriggered('w')) {
        this.moveFocus(-1);
    } else if (Input.isTriggered('ok') || Input.isTriggered('ok')) {
        this.triggerAction();
    }
};

Window_KnowledgeTree.prototype.moveFocus = function(direction) {
    if (this._focusedColumn === 0) {
        this.changeActorFocus(direction);
    } else if (this._focusedColumn === 1) {
        this.changeSkillFocus(direction);
    }
    // Note: No navigation for prerequisites, as they are not interactable.
};

Window_KnowledgeTree.prototype.changeActorFocus = function(direction) {
    this._actorIndex = (this._actorIndex + direction).clamp(0, this._actorButtons.length - 1);
    this.updateFocus();
};

Window_KnowledgeTree.prototype.changeSkillFocus = function(direction) {
    this._skillIndex = (this._skillIndex + direction).clamp(0, this._skillButtons.length - 1);
    this.updateFocus();
};

Window_KnowledgeTree.prototype.updateFocus = function() {
    this._actorButtons.forEach((button, index) => {
        button.bitmap.clear();
        if (index === this._actorIndex && this._focusedColumn === 0) {
            button.bitmap.fillRect(0, 0, buttonWidth, buttonHeight, '#aaaaaa'); // Focus color
            button._isFocused = true;
        }else
        {
            button._isFocused = false;
        }
        button.update();
    });

    this._skillButtons.forEach((button, index) => {
        button.bitmap.clear();
        if (index === this._skillIndex && this._focusedColumn === 1) {
            button.bitmap.fillRect(0, 0, buttonWidth, buttonHeight, '#aaaaaa'); // Focus color
            button._isFocused = true;
        }else
        {
            button._isFocused = false;
        }
        button.update();
    });
};

Window_KnowledgeTree.prototype.triggerAction = function() {
    if (this._focusedColumn === 0) {
        this._actorButtons[this._actorIndex].callClickHandler();
    } else if (this._focusedColumn === 1) {
        this._skillButtons[this._skillIndex].callClickHandler();
    }
};

/**
 * Windows Actor Column
 */
Window_KnowledgeTree.prototype.createActorColumn = function() {
    this._actorButtons = [];
    let x = 0;
    let y = 0;

    $gameParty.members().forEach((actor, index) => {
        let button = createButton(actor.name(), buttonWidth, buttonHeight, x, y + index * (buttonHeight + 10), () => this.selectActor(actor));
        this.addChild(button);
        this._actorButtons.push(button);
    });
};

Window_KnowledgeTree.prototype.selectActor = function(actor) {
    this._actor = actor;
    this.refreshSkillsColumn();
    this.refreshPrerequisitesColumn(); // Clear or reset prerequisites column
};

Window_KnowledgeTree.prototype.refreshActorColumn = function() {
    if (this._actorButtons) {
        this._actorButtons.forEach(button => this.removeChild(button));
    }
    this.createActorColumn();
};

function createButton(text, buttonWidth, buttonHeight, x, y, clickHandler) {
    let button = new Sprite_Button();
    button.bitmap = new Bitmap(buttonWidth, buttonHeight);
    button.bitmap.drawText(text, 0, 0, buttonWidth, buttonHeight, 'center');
    button.x = x;
    button.y = y;

    // Draw border
    button.bitmap.fillRect(0, 0, buttonWidth, 2, ButtonBorderColor); // Top border
    button.bitmap.fillRect(0, buttonHeight - 2, buttonWidth, 2, ButtonBorderColor); // Bottom border
    button.bitmap.fillRect(0, 0, 2, buttonHeight, ButtonBorderColor); // Left border
    button.bitmap.fillRect(buttonWidth - 2, 0, 2, buttonHeight, ButtonBorderColor); // Right border

    // Pulsating effect
    button._pulseValue = 0;
    button._pulseDirection = 1;
    button._isFocused=false;
    button.update = function() {
        if (button._isFocused) {
            this._pulseValue += this._pulseDirection * 0.05;
            if (this._pulseValue > 1 || this._pulseValue < 0) {
                this._pulseDirection *= -1;
                this._pulseValue = Math.max(0, Math.min(1, this._pulseValue));
            }
            const color = (Math.floor(128 + 127 * this._pulseValue)).toString(16).padStart(2, '0');
            this.bitmap.fillRect(0, 0, buttonWidth, buttonHeight, `#${color}${color}${color}`);
        }
        this.bitmap.drawText(text, 0, 0, buttonWidth, buttonHeight, 'center');
    };

    button.setClickHandler(clickHandler);
    return button;
}
/**
 * Windows Skill Column
 */
Window_KnowledgeTree.prototype.createSkillsColumn = function() {
    this._skillButtons = [];
    let x = 220;
    let y = 0;

    this._actor.skills().forEach((skill, index) => {
        let button = createButton(skill.name, buttonWidth, buttonHeight, x, y + index * (buttonHeight + 10), () => this.selectSkill(skill));
        this.addChild(button);
        this._skillButtons.push(button);
    });
};

Window_KnowledgeTree.prototype.selectSkill = function(skill) {
    this._selectedSkill = skill;
    this.refreshPrerequisitesColumn();
};

Window_KnowledgeTree.prototype.refreshSkillsColumn = function() {
    if (this._skillButtons) {
        this._skillButtons.forEach(button => this.removeChild(button));
    }
    this.createSkillsColumn();
};

/**
 * Window Pre-requisite Column
 */
Window_KnowledgeTree.prototype.createPrerequisitesColumn = function() {
    this._prerequisiteTexts = [];
    let x = 440;
    let y = 0;

    let prerequisites = SkillTree.prerequisites[this._selectedSkill.id] || [];
    prerequisites.forEach((prereqId, index) => {
        let prereqSkill = $dataSkills[prereqId];
        if (prereqSkill) {
            let text = new Sprite();
            text.bitmap = new Bitmap(200, 48);
            text.bitmap.drawText(prereqSkill.name, 0, 0, 200, 48, 'center');
            text.x = x;
            text.y = y + index * 58;
            this.addChild(text);
            this._prerequisiteTexts.push(text);
        }
    });
};

Window_KnowledgeTree.prototype.refreshPrerequisitesColumn = function() {
    if (this._prerequisiteTexts) {
        this._prerequisiteTexts.forEach(text => this.removeChild(text));
    }
    if (this._selectedSkill) {
        this.createPrerequisitesColumn();
    }
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