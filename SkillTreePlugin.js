/*:
 * @plugindesc A brief description of what your plugin does.
 * @author RtGherman
 *
 * @param ExampleParam
 * @text Example Parameter
 * @desc Description of what this parameter does.
 * @type number
 * @min 0
 * @default 10
 *
 * @help
 * Detailed explanation of the plugin's functionality, including how to use it.
 */

(function() {
    // Your plugin code here
    var parameters = PluginManager.parameters('MyCustomPlugin');
    var exampleParam = Number(parameters['ExampleParam'] || 10);

    // Plugin functionality
    // Example: Add a command to the menu
    var _Scene_Menu_create = Scene_Menu.prototype.create;
    Scene_Menu.prototype.create = function() {
        _Scene_Menu_create.call(this);
        // Your code to add new functionality
    };

})();

// Example structure for skill prerequisites
var SkillTree = SkillTree || {};

SkillTree.prerequisites = {
    1: [0], // Skill ID 1 requires Skill ID 0
    2: [1], // Skill ID 2 requires Skill ID 1
    3: [1], // Skill ID 3 requires Skill ID 1
    4: [2, 3], // Skill ID 4 requires both Skill IDs 2 and 3
    // Add more skills and their prerequisites as needed
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