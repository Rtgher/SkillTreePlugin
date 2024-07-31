/*:
 * @plugindesc Adds a tree-like dependency to skills, along with a window to see the skills.
 * @author RtGherman
 *
 * @param SkillTree
 * @text Example Parameter
 * @desc Description of what this parameter does.
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

var SkillTree = SkillTree || {};

(function() {

    // Hook into Scene_Boot's start method to ensure the game data is fully loaded
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        StartPlugin();
    };

})();

function StartPlugin() {
    var parameters = PluginManager.parameters('MyCustomPlugin');

    SetUpSkillTree(SkillTree);

    // Plugin functionality
    // Example: Add a command to the menu
    var _Scene_Menu_create = Scene_Menu.prototype.create;
    Scene_Menu.prototype.create = function () {
        _Scene_Menu_create.call(this);
    };
}

function SetUpSkillTree(SkillTree) {
    SkillTree.prerequisites = {};

    $dataSkills.forEach(function(skill) {
        if (skill && skill.note) {
            var match = skill.note.match(/<Prerequisites:\s*(.+)>/i);
            if (match) {
                var prereqList = match[1].split(',').map(Number);
                SkillTree.prerequisites[skill.id] = prereqList;
            }
        }
    });
};


/*
 * Skill Tree Window
 */
function Window_SkillTree() {
    this.initialize.apply(this, arguments);
}

Window_SkillTree.prototype = Object.create(Window_Base.prototype);
Window_SkillTree.prototype.constructor = Window_SkillTree;

Window_SkillTree.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this.refresh();
};

Window_SkillTree.prototype.refresh = function() {
    this.contents.clear();
    // Draw the skill tree here
    this.drawSkillTree();
};

Window_SkillTree.prototype.drawSkillTree = function() {
    var skills = Object.keys(SkillTree.prerequisites);
    for (var i = 0; i < skills.length; i++) {
        var skillId = Number(skills[i]);
        var skill = $dataSkills[skillId];
        var x = i * 100; // Example positioning, adjust as needed
        var y = 0; // Adjust based on your tree structure
        this.drawText(skill.name, x, y, 100, 'left');
        // Draw connections and prerequisites
    }
};

/*
 * Scene Integration
 */

var _Scene_Skill_create = Scene_Skill.prototype.create;
Scene_Skill.prototype.create = function() {
    _Scene_Skill_create.call(this);
    this.createSkillTreeWindow();
};

Scene_Skill.prototype.createSkillTreeWindow = function() {
    var wx = 0;
    var wy = this._helpWindow.height;
    var ww = Graphics.boxWidth;
    var wh = Graphics.boxHeight - wy;
    this._skillTreeWindow = new Window_SkillTree(wx, wy, ww, wh);
    this.addWindow(this._skillTreeWindow);
};

/*
 * Skill Learning
 */
(function() {
    var _Game_Actor_learnSkill = Game_Actor.prototype.learnSkill;
    Game_Actor.prototype.learnSkill = function(skillId) {
        if (this.canLearnSkill(skillId)) {
            _Game_Actor_learnSkill.call(this, skillId);
        }
    };

    Game_Actor.prototype.canLearnSkill = function(skillId) {
        var prerequisites = SkillTree.prerequisites[skillId];
        if (!prerequisites) return true; // No prerequisites, can learn directly
        return prerequisites.every(function(prerequisiteId) {
            return this.isLearnedSkill(prerequisiteId);
        }, this);
    };
})();