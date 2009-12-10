(function() {
     const
     FILE_T = 100,
     DIR_T = 101,
     LINK_T = 102,
     READ_P = 4,
     WRITE_P = 2,
     EXEC_P = 1,
     NIL_P = 0;

     if (!('isSpace' in String.prototype)) {
         String.prototype.isSpace = function() {
             return ($.trim(this).length == 0);
         };
     }

     Term = function(fs, env, output, prompt, input) {
         this.fs = fs;
         if (!('HOME' in env && 'PATH' in env && 'USER' in env &&
               'HOSTNAME' in env)) {
             // oops
             return;
         }
         this.env = env;
         if (!('PWD' in this.env)) {
             this.env['PWD'] = this.env['HOME'];
         }
         this.elts = {
             output: output,
             prompt: prompt,
             input: input
         };

         var parentize = function(dir) {
             for (var subdir in dir.contents) {
                 if (dir.contents && dir.contents[subdir].type == DIR_T) {
                     dir.contents[subdir].parent = dir;
                     parentize(dir.contents[subdir]);
                 }
             }
         };
         parentize(this.fs);
         this.fs.parent = this.fs;

         this.elts.prompt.append(document.createTextNode(this.getPrompt()));
         this.readline = new Readline(this.elts.input, this, this.doline);
     };

     Term.prototype.types = Term.types = {
         file: FILE_T,
         link: LINK_T,
         dir: DIR_T
     };

     Term.prototype.perms = Term.perms = {
         read: READ_P,
         write: WRITE_P,
         exec: EXEC_P,
         nil: NIL_P
     };

     /**
      * Gets what would be the current prompt
      */
     Term.prototype.getPrompt = function() {
         return this.env['USER'] + '@' + this.env['HOSTNAME'] + ' ' +
             this.canonpath(this.env['PWD']) + ' $ ';
     };

     /**
      * Useful both for determining if a retval is an error, and for
      * something like perror.  Maybe I should write perror....
      */
     Term.prototype.errnos = {
         EACCES: 'Permission denied',
         EISDIR: 'Is a directory',
         EINVAL: 'Invalid argument',
         ENOENT: 'No such file or directory',
         ENOTDIR: 'not a directory'
     };

     Term.prototype.doline = function(text, exec) {
         // Print the last prompt and command
         this.print(this.getPrompt() + text + '\n');
         var retval = false;
         // Run
         if (exec) {
             retval = this.exec.apply(this, text.split(' '));
         }
         // Print a new prompt
         this.elts.prompt.text(this.getPrompt());
         return retval;
     };

     /**
      * Actually more like system(3) in its semantics, and more like
      * execlp(3) in its invokation.
      */
     Term.prototype.exec = function() {
         var argv = $.grep($.makeArray(arguments), function(s) {
                               return s.isSpace();
                           }, true);
         if (argv.length < 1) {
             return false;
         }

         var bin = this.pathtonodeexec(argv[0]);
         var retval = true;
         if (bin in this.errnos) {
             this.print(argv[0] + ': ' + this.errnos[bin] + '\n');
             retval = false;
         } else if (bin.type != FILE_T || !(bin.perm & EXEC_P)) {
             this.print(argvtokens[0] + ': ' + this.errnos['EACCES'] + '\n');
             retval = false;
         } else {
             retval = bin.exec.apply(this, argv.slice(1, argv.length));
         }

         return retval;
     };

     /**
      * Helper function for path resolution. Use pathtonode* instead of
      * using directly.
      */
     Term.prototype._find = function(root, pathbits) {
         if (pathbits.length == 0) {
             return root;
         } else if (pathbits[0] == '.') {
             return this._find(root, pathbits.slice(1, pathbits.length));
         } else if (pathbits[0] == '..') {
             return this._find(root.parent, pathbits.slice(1, pathbits.length));
         }

         if (!('contents' in root && pathbits[0] in root.contents)) {
             return 'ENOENT';
         }
         var nextnode = root.contents[pathbits[0]];
         if (nextnode.perm & READ_P) {
             return this._find(nextnode, pathbits.slice(1, pathbits.length));
         } else {
             return 'EACCES';
         }
     };

     /**
      * Resolves a path, relative or absolute.
      */
     Term.prototype.pathtonode = function(path) {
         return this._find(this.fs,
                           $.grep(this.abspath(path).split('/'), function(s) {
                                      return s.isSpace();
                                  }, true));
     };

     /**
      * Resolves a path, relative or absolute, but with shell semantics:
      *  - absolute paths are resolved normally
      *  - relative paths containing a '/' character are resolved normally
      *  - single filenames are searched for in $PATH.  Currently, $PATH
      *    only contains one directory.
      */
     Term.prototype.pathtonodeexec = function(path) {
         var pathbits = path.split('/');
         if (path[0] != '/' && pathbits.length == 1) {
             var splitenvpath = this.env['PATH'].split(':');
             var found = false;
             var term = this;
             $.each(splitenvpath, function() {
                        found = term._find(term.pathtonode(this), pathbits);
                        if (found && !(found in term.errnos)) {
                            return false;  // break
                        }
                        return true;  // continue
                    });
             if (found == false) {
                 return 'ENOENT';
             } else {
                 return found;
             }
         } else {
             return this.pathtonode(path);
         }
     };

     /**
      * Converts a relative or absolute path to an absolute one.  Also
      * performs tilde expansion, but without a username.
      */
     Term.prototype.abspath = function(path) {
         var pathfromroot = '';
         if (path[0] == '/') {
             pathfromroot = path;
         } else if (path.length == 1 && path[0] == '~') {
             return this.env['HOME'];
         } else if (path.substring(0,2) == '~/') {
             pathfromroot = this.env['HOME'] + '/' +
                 path.substring(2, path.length);
         } else {
             pathfromroot = this.env['PWD'] + '/' + path;
         }
         var splitpath = $.grep(pathfromroot.split('/'), function(s) {
                                    return s.isSpace();
                                }, true);
         var abspathbits = new Array();
         $.each(splitpath, function() {
                    if (this == '..') {
                        if (abspathbits.length > 0) {
                            abspathbits.pop();
                        }
                    } else if (this != '.') {
                        abspathbits.push(this);
                    }
                });
         if (abspathbits.length == 0) {
             return '/';
         } else {
             return '/' + abspathbits.join('/');
         }
     };

     /**
      * Converts a path to an absolute path, replacing $HOME with the tilde.
      */
     Term.prototype.canonpath = function(path) {
         var abspath = this.abspath(path);
         return abspath.replace(new RegExp('^' + this.env['HOME']), '~');
     };

     /**
      * Wraps stuff in <span> or <a> tags (if something is a link), then
      * outputs it.
      */
     Term.prototype.show = function(name, node) {
         var elt;
         if (node.type == FILE_T) {
             if (node.perm & EXEC_P) {
                 elt = $('<span class="file exec" />');
             } else {
                 elt = $('<span class="file" />');
             }
         } else if (node.type == LINK_T) {
             elt = $('<a href="' + node.contents[0] + '" class="link" target="_blank" />');
         } else if (node.type == DIR_T) {
             elt = $('<span class="dir" />');
         }
         elt.text(name);
         return elt;
     };

     /**
      * Prints something to the "terminal". This can be either a string or a DOM
      * node.
      */
     Term.prototype.print = function(o) {
         if (o) {
             this.elts.output.append(o);
         }
         $.scrollTo('max');
     };

     Term.prototype.println = function(o) {
         this.print(o);
         this.print('\n');
     };
 })();