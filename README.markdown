jsh
===

A very, very limited implementation of `/bin/sh`, in javascript.

Acts like a unix shell in your browser, backed by a JSON filesystem.

Comes without [coreutils][].

[coreutils]: http://www.gnu.org/software/coreutils/

USAGE
-----

    var fs = { /* filesystem tree, see below */ };
    var env = {
        HOME: '/home/leif',
        PATH: '/bin',  /* '/bin:/usr/bin' is also okay */
        USER: 'leif',
        HOSTNAME: 'github'
    };
    var motd = [
        'hello world'
    ];
    var output = $('#output');
    var prompt = $('#prompt);
    var input = $('#input');

    new Term(fs, env, output, prompt, input);
    for (var i in motd) {
        term.println(motd[i]);
    }

The `Term` constructor takes five arguments:

 * `fs`: The filesystem the shell should present to the user.  This is a
   nested javascript object hierarchy faking a filesystem.
   
   Each node should have at least a `type` (of `Term.types.dir`,
   `Term.types.file`, or `Term.types.link`) and a `perm`, which is a sum (or OR)
   of `Term.perms.read`, `Term.perms.write`, and `Term.perms.exec`. I don't
   expect to see `Term.perms.write` here, but hey, maybe you want it.
   
   If something has `Term.perms.read`, it should have `contents`.  A file should
   have an array of strings, and a directory should have more nodes underneath
   it.  A link should also have an array, but it should only have one element,
   the string the link should point to.  Links, when printed, be printed in
   `<a>` elements, using the `Term.show` function.
   
   If something has `Term.perms.exec`, it should have an `exec` function.  This
   will be called with the strings given on the command line, minus the
   command's name (no `argv[0]`).  It's not yet smart enough to parse `\ ` or
   quoted strings; it literally just passes the result of `String.split(' ')`,
   minus empty strings.  Additionally, inside your `exec` function, the `this`
   reference will refer to the `Term` object from which it was called.  There
   are several helpful functions within that you are free to use.
 * `env`: A javascript object with at least `HOME`, `PATH`, `USER`, and
   `HOSTNAME` fields, and optionally `PWD` (which defaults to `env['HOME']`).
   These should be self-explanatory if you're reading this.
 * `output`, `prompt`, and `input`: DOM elements used for outputting, prompting,
   and inputting.

You will have to implement your own [coreutils][] inside your filesystem
hierarchy.

EXAMPLE
-------

[adlaiff6.github.com](http://adlaiff6.github.com/) ([source][])

[source]: http://github.com/adlaiff6/adlaiff6.github.com/

DEPENDENCIES
------------

 * [jQuery][]
 * [jQuery.ScrollTo][scrollto]

[jquery]: http://jquery.com/
[scrollto]: http://flesler.blogspot.com/2007/10/jqueryscrollto.html

BUGS
----

Yes.  Email me (<leif.walsh@gmail.com>).

Contributing
------------

Fork and send pull requests.
