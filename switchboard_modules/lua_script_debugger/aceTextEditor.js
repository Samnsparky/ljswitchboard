/**
 * An accessory file for the Lua script debugger module that defines the
 * textEditor object.
 *
 * @author Chris Johnson (LabJack Corp, 2013)
 *
**/


function textEditor() {
    var editor;
    var htmlID = '';
    var editorTheme = '';
    var editorMode = '';
    var curHeight = -1;
    this.destroy = function() {
        self.editor.destroy();
    };
    this.setupEditor = function(id, theme, mode) {
        self.htmlID = id;
        self.editorTheme = theme;
        self.editorMode = mode;

        // Initialize the aceEditor instance
        
        try{
            self.editor = ace.edit(id);
            self.editor.setTheme(theme);
            self.editor.getSession().setMode(mode);
        } catch(err) {
            console.error('Error initializing ace editor',err);
        }
    };
    this.setHeight = function(newHeight) {
        if(newHeight != self.curHeight) {
            if (typeof(newHeight) === 'number') {
                $('#'+self.htmlID).height(newHeight.toString() + 'px');
            } else if (typeof(newHeight) === 'string') {
                $('#'+self.htmlID).height(newHeight + 'px');
            }
        }
        try{
            self.editor.resize(true);
        } catch(err) {
            console.error('Error Resizing ace editor',err);
            alert('Error resizing ace editor');
        }
    };
    this.getHeight = function() {
        if(self.curHeight == -1) {
            self.curHeight = $('#'+self.htmlID).height();
        }
        return self.curHeight;
    };

    var self = this;
}
