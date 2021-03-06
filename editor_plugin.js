(function () {
    /* PrismJS 1.16.0
    https://prismjs.com/download.html#themes=prism&languages=markup+css+clike+javascript+markup-templating+php+json+sql+yaml */
    var _self = (typeof window !== 'undefined')
        ? window   // if in browser
        : (
            (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
                ? self // if in worker
                : {}   // if in node js
        );

    /**
     * Prism: Lightweight, robust, elegant syntax highlighting
     * MIT license http://www.opensource.org/licenses/mit-license.php/
     * @author Lea Verou http://lea.verou.me
     */

    var Prism = (function (_self) {

        // Private helper vars
        var lang = /\blang(?:uage)?-([\w-]+)\b/i;
        var uniqueId = 0;

        var _ = {
            manual: _self.Prism && _self.Prism.manual,
            disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,
            util: {
                encode: function (tokens) {
                    if (tokens instanceof Token) {
                        return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
                    } else if (Array.isArray(tokens)) {
                        return tokens.map(_.util.encode);
                    } else {
                        return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
                    }
                },

                type: function (o) {
                    return Object.prototype.toString.call(o).slice(8, -1);
                },

                objId: function (obj) {
                    if (!obj['__id']) {
                        Object.defineProperty(obj, '__id', { value: ++uniqueId });
                    }
                    return obj['__id'];
                },

                // Deep clone a language definition (e.g. to extend it)
                clone: function deepClone(o, visited) {
                    var clone, id, type = _.util.type(o);
                    visited = visited || {};

                    switch (type) {
                        case 'Object':
                            id = _.util.objId(o);
                            if (visited[id]) {
                                return visited[id];
                            }
                            clone = {};
                            visited[id] = clone;

                            for (var key in o) {
                                if (o.hasOwnProperty(key)) {
                                    clone[key] = deepClone(o[key], visited);
                                }
                            }

                            return clone;

                        case 'Array':
                            id = _.util.objId(o);
                            if (visited[id]) {
                                return visited[id];
                            }
                            clone = [];
                            visited[id] = clone;

                            o.forEach(function (v, i) {
                                clone[i] = deepClone(v, visited);
                            });

                            return clone;

                        default:
                            return o;
                    }
                }
            },

            languages: {
                extend: function (id, redef) {
                    var lang = _.util.clone(_.languages[id]);

                    for (var key in redef) {
                        lang[key] = redef[key];
                    }

                    return lang;
                },

                /**
                 * Insert a token before another token in a language literal
                 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
                 * we cannot just provide an object, we need an object and a key.
                 * @param inside The key (or language id) of the parent
                 * @param before The key to insert before.
                 * @param insert Object with the key/value pairs to insert
                 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
                 */
                insertBefore: function (inside, before, insert, root) {
                    root = root || _.languages;
                    var grammar = root[inside];
                    var ret = {};

                    for (var token in grammar) {
                        if (grammar.hasOwnProperty(token)) {

                            if (token == before) {
                                for (var newToken in insert) {
                                    if (insert.hasOwnProperty(newToken)) {
                                        ret[newToken] = insert[newToken];
                                    }
                                }
                            }

                            // Do not insert token which also occur in insert. See #1525
                            if (!insert.hasOwnProperty(token)) {
                                ret[token] = grammar[token];
                            }
                        }
                    }

                    var old = root[inside];
                    root[inside] = ret;

                    // Update references in other language definitions
                    _.languages.DFS(_.languages, function (key, value) {
                        if (value === old && key != inside) {
                            this[key] = ret;
                        }
                    });

                    return ret;
                },

                // Traverse a language definition with Depth First Search
                DFS: function DFS(o, callback, type, visited) {
                    visited = visited || {};

                    var objId = _.util.objId;

                    for (var i in o) {
                        if (o.hasOwnProperty(i)) {
                            callback.call(o, i, o[i], type || i);

                            var property = o[i],
                                propertyType = _.util.type(property);

                            if (propertyType === 'Object' && !visited[objId(property)]) {
                                visited[objId(property)] = true;
                                DFS(property, callback, null, visited);
                            }
                            else if (propertyType === 'Array' && !visited[objId(property)]) {
                                visited[objId(property)] = true;
                                DFS(property, callback, i, visited);
                            }
                        }
                    }
                }
            },
            plugins: {},

            highlightAll: function (async, callback) {
                _.highlightAllUnder(document, async, callback);
            },

            highlightAllUnder: function (container, async, callback) {
                var env = {
                    callback: callback,
                    selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
                };

                _.hooks.run("before-highlightall", env);

                var elements = env.elements || container.querySelectorAll(env.selector);

                for (var i = 0, element; element = elements[i++];) {
                    _.highlightElement(element, async === true, env.callback);
                }
            },

            highlightElement: function (element, async, callback) {
                // Find language
                var language = 'none', grammar, parent = element;

                while (parent && !lang.test(parent.className)) {
                    parent = parent.parentNode;
                }

                if (parent) {
                    language = (parent.className.match(lang) || [, 'none'])[1].toLowerCase();
                    grammar = _.languages[language];
                }

                // Set language on the element, if not present
                element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

                if (element.parentNode) {
                    // Set language on the parent, for styling
                    parent = element.parentNode;

                    if (/pre/i.test(parent.nodeName)) {
                        parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
                    }
                }

                var code = element.textContent;

                var env = {
                    element: element,
                    language: language,
                    grammar: grammar,
                    code: code
                };

                var insertHighlightedCode = function (highlightedCode) {
                    env.highlightedCode = highlightedCode;

                    _.hooks.run('before-insert', env);

                    env.element.innerHTML = env.highlightedCode;

                    _.hooks.run('after-highlight', env);
                    _.hooks.run('complete', env);
                    callback && callback.call(env.element);
                }

                _.hooks.run('before-sanity-check', env);

                if (!env.code) {
                    _.hooks.run('complete', env);
                    return;
                }

                _.hooks.run('before-highlight', env);

                if (!env.grammar) {
                    insertHighlightedCode(_.util.encode(env.code));
                    return;
                }

                if (async && _self.Worker) {
                    var worker = new Worker(_.filename);

                    worker.onmessage = function (evt) {
                        insertHighlightedCode(evt.data);
                    };

                    worker.postMessage(JSON.stringify({
                        language: env.language,
                        code: env.code,
                        immediateClose: true
                    }));
                }
                else {
                    insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
                }
            },

            highlight: function (text, grammar, language) {
                var env = {
                    code: text,
                    grammar: grammar,
                    language: language
                };
                _.hooks.run('before-tokenize', env);
                env.tokens = _.tokenize(env.code, env.grammar);
                _.hooks.run('after-tokenize', env);
                return Token.stringify(_.util.encode(env.tokens), env.language);
            },

            matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
                for (var token in grammar) {
                    if (!grammar.hasOwnProperty(token) || !grammar[token]) {
                        continue;
                    }

                    if (token == target) {
                        return;
                    }

                    var patterns = grammar[token];
                    patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

                    for (var j = 0; j < patterns.length; ++j) {
                        var pattern = patterns[j],
                            inside = pattern.inside,
                            lookbehind = !!pattern.lookbehind,
                            greedy = !!pattern.greedy,
                            lookbehindLength = 0,
                            alias = pattern.alias;

                        if (greedy && !pattern.pattern.global) {
                            // Without the global flag, lastIndex won't work
                            var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
                            pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
                        }

                        pattern = pattern.pattern || pattern;

                        // Don’t cache length as it changes during the loop
                        for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

                            var str = strarr[i];

                            if (strarr.length > text.length) {
                                // Something went terribly wrong, ABORT, ABORT!
                                return;
                            }

                            if (str instanceof Token) {
                                continue;
                            }

                            if (greedy && i != strarr.length - 1) {
                                pattern.lastIndex = pos;
                                var match = pattern.exec(text);
                                if (!match) {
                                    break;
                                }

                                var from = match.index + (lookbehind ? match[1].length : 0),
                                    to = match.index + match[0].length,
                                    k = i,
                                    p = pos;

                                for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
                                    p += strarr[k].length;
                                    // Move the index i to the element in strarr that is closest to from
                                    if (from >= p) {
                                        ++i;
                                        pos = p;
                                    }
                                }

                                // If strarr[i] is a Token, then the match starts inside another Token, which is invalid
                                if (strarr[i] instanceof Token) {
                                    continue;
                                }

                                // Number of tokens to delete and replace with the new match
                                delNum = k - i;
                                str = text.slice(pos, p);
                                match.index -= pos;
                            } else {
                                pattern.lastIndex = 0;

                                var match = pattern.exec(str),
                                    delNum = 1;
                            }

                            if (!match) {
                                if (oneshot) {
                                    break;
                                }

                                continue;
                            }

                            if (lookbehind) {
                                lookbehindLength = match[1] ? match[1].length : 0;
                            }

                            var from = match.index + lookbehindLength,
                                match = match[0].slice(lookbehindLength),
                                to = from + match.length,
                                before = str.slice(0, from),
                                after = str.slice(to);

                            var args = [i, delNum];

                            if (before) {
                                ++i;
                                pos += before.length;
                                args.push(before);
                            }

                            var wrapped = new Token(token, inside ? _.tokenize(match, inside) : match, alias, match, greedy);

                            args.push(wrapped);

                            if (after) {
                                args.push(after);
                            }

                            Array.prototype.splice.apply(strarr, args);

                            if (delNum != 1)
                                _.matchGrammar(text, strarr, grammar, i, pos, true, token);

                            if (oneshot)
                                break;
                        }
                    }
                }
            },

            tokenize: function (text, grammar) {
                var strarr = [text];

                var rest = grammar.rest;

                if (rest) {
                    for (var token in rest) {
                        grammar[token] = rest[token];
                    }

                    delete grammar.rest;
                }

                _.matchGrammar(text, strarr, grammar, 0, 0, false);

                return strarr;
            },

            hooks: {
                all: {},

                add: function (name, callback) {
                    var hooks = _.hooks.all;

                    hooks[name] = hooks[name] || [];

                    hooks[name].push(callback);
                },

                run: function (name, env) {
                    var callbacks = _.hooks.all[name];

                    if (!callbacks || !callbacks.length) {
                        return;
                    }

                    for (var i = 0, callback; callback = callbacks[i++];) {
                        callback(env);
                    }
                }
            },

            Token: Token
        };

        _self.Prism = _;

        function Token(type, content, alias, matchedStr, greedy) {
            this.type = type;
            this.content = content;
            this.alias = alias;
            // Copy of the full string this token was created from
            this.length = (matchedStr || "").length | 0;
            this.greedy = !!greedy;
        }

        Token.stringify = function (o, language) {
            if (typeof o == 'string') {
                return o;
            }

            if (Array.isArray(o)) {
                return o.map(function (element) {
                    return Token.stringify(element, language);
                }).join('');
            }

            var env = {
                type: o.type,
                content: Token.stringify(o.content, language),
                tag: 'span',
                classes: ['token', o.type],
                attributes: {},
                language: language
            };

            if (o.alias) {
                var aliases = Array.isArray(o.alias) ? o.alias : [o.alias];
                Array.prototype.push.apply(env.classes, aliases);
            }

            _.hooks.run('wrap', env);

            var attributes = Object.keys(env.attributes).map(function (name) {
                return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
            }).join(' ');

            return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';
        };

        if (!_self.document) {
            if (!_self.addEventListener) {
                // in Node.js
                return _;
            }

            if (!_.disableWorkerMessageHandler) {
                // In worker
                _self.addEventListener('message', function (evt) {
                    var message = JSON.parse(evt.data),
                        lang = message.language,
                        code = message.code,
                        immediateClose = message.immediateClose;

                    _self.postMessage(_.highlight(code, _.languages[lang], lang));
                    if (immediateClose) {
                        _self.close();
                    }
                }, false);
            }

            return _;
        }

        return _;

    })(_self);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Prism;
    }

    // hack for components to work correctly in node.js
    if (typeof global !== 'undefined') {
        global.Prism = Prism;
    }
    ;
    Prism.languages.markup = {
        'comment': /<!--[\s\S]*?-->/,
        'prolog': /<\?[\s\S]+?\?>/,
        'doctype': /<!DOCTYPE[\s\S]+?>/i,
        'cdata': /<!\[CDATA\[[\s\S]*?]]>/i,
        'tag': {
            pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/i,
            greedy: true,
            inside: {
                'tag': {
                    pattern: /^<\/?[^\s>\/]+/i,
                    inside: {
                        'punctuation': /^<\/?/,
                        'namespace': /^[^\s>\/:]+:/
                    }
                },
                'attr-value': {
                    pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/i,
                    inside: {
                        'punctuation': [
                            /^=/,
                            {
                                pattern: /^(\s*)["']|["']$/,
                                lookbehind: true
                            }
                        ]
                    }
                },
                'punctuation': /\/?>/,
                'attr-name': {
                    pattern: /[^\s>\/]+/,
                    inside: {
                        'namespace': /^[^\s>\/:]+:/
                    }
                }

            }
        },
        'entity': /&#?[\da-z]{1,8};/i
    };

    Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
        Prism.languages.markup['entity'];

    // Plugin to make entity title show the real entity, idea by Roman Komarov
    Prism.hooks.add('wrap', function (env) {

        if (env.type === 'entity') {
            env.attributes['title'] = env.content.replace(/&amp;/, '&');
        }
    });

    Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
        /**
         * Adds an inlined language to markup.
         *
         * An example of an inlined language is CSS with `<style>` tags.
         *
         * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
         * case insensitive.
         * @param {string} lang The language key.
         * @example
         * addInlined('style', 'css');
         */
        value: function addInlined(tagName, lang) {
            var includedCdataInside = {};
            includedCdataInside['language-' + lang] = {
                pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
                lookbehind: true,
                inside: Prism.languages[lang]
            };
            includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

            var inside = {
                'included-cdata': {
                    pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
                    inside: includedCdataInside
                }
            };
            inside['language-' + lang] = {
                pattern: /[\s\S]+/,
                inside: Prism.languages[lang]
            };

            var def = {};
            def[tagName] = {
                pattern: RegExp(/(<__[\s\S]*?>)(?:<!\[CDATA\[[\s\S]*?\]\]>\s*|[\s\S])*?(?=<\/__>)/.source.replace(/__/g, tagName), 'i'),
                lookbehind: true,
                greedy: true,
                inside: inside
            };

            Prism.languages.insertBefore('markup', 'cdata', def);
        }
    });

    Prism.languages.xml = Prism.languages.extend('markup', {});
    Prism.languages.html = Prism.languages.markup;
    Prism.languages.mathml = Prism.languages.markup;
    Prism.languages.svg = Prism.languages.markup;

    (function (Prism) {

        var string = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

        Prism.languages.css = {
            'comment': /\/\*[\s\S]*?\*\//,
            'atrule': {
                pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
                inside: {
                    'rule': /@[\w-]+/
                    // See rest below
                }
            },
            'url': RegExp('url\\((?:' + string.source + '|.*?)\\)', 'i'),
            'selector': RegExp('[^{}\\s](?:[^{};"\']|' + string.source + ')*?(?=\\s*\\{)'),
            'string': {
                pattern: string,
                greedy: true
            },
            'property': /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
            'important': /!important\b/i,
            'function': /[-a-z0-9]+(?=\()/i,
            'punctuation': /[(){};:,]/
        };

        Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

        var markup = Prism.languages.markup;
        if (markup) {
            markup.tag.addInlined('style', 'css');

            Prism.languages.insertBefore('inside', 'attr-value', {
                'style-attr': {
                    pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
                    inside: {
                        'attr-name': {
                            pattern: /^\s*style/i,
                            inside: markup.tag.inside
                        },
                        'punctuation': /^\s*=\s*['"]|['"]\s*$/,
                        'attr-value': {
                            pattern: /.+/i,
                            inside: Prism.languages.css
                        }
                    },
                    alias: 'language-css'
                }
            }, markup.tag);
        }

    }(Prism));

    Prism.languages.clike = {
        'comment': [
            {
                pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
                lookbehind: true
            },
            {
                pattern: /(^|[^\\:])\/\/.*/,
                lookbehind: true,
                greedy: true
            }
        ],
        'string': {
            pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
            greedy: true
        },
        'class-name': {
            pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[\w.\\]+/i,
            lookbehind: true,
            inside: {
                punctuation: /[.\\]/
            }
        },
        'keyword': /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
        'boolean': /\b(?:true|false)\b/,
        'function': /\w+(?=\()/,
        'number': /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
        'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
        'punctuation': /[{}[\];(),.:]/
    };

    Prism.languages.javascript = Prism.languages.extend('clike', {
        'class-name': [
            Prism.languages.clike['class-name'],
            {
                pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
                lookbehind: true
            }
        ],
        'keyword': [
            {
                pattern: /((?:^|})\s*)(?:catch|finally)\b/,
                lookbehind: true
            },
            {
                pattern: /(^|[^.])\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
                lookbehind: true
            },
        ],
        'number': /\b(?:(?:0[xX][\dA-Fa-f]+|0[bB][01]+|0[oO][0-7]+)n?|\d+n|NaN|Infinity)\b|(?:\b\d+\.?\d*|\B\.\d+)(?:[Ee][+-]?\d+)?/,
        // Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
        'function': /[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
        'operator': /-[-=]?|\+[+=]?|!=?=?|<<?=?|>>?>?=?|=(?:==?|>)?|&[&=]?|\|[|=]?|\*\*?=?|\/=?|~|\^=?|%=?|\?|\.{3}/
    });

    Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/;

    Prism.languages.insertBefore('javascript', 'keyword', {
        'regex': {
            pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=\s*($|[\r\n,.;})\]]))/,
            lookbehind: true,
            greedy: true
        },
        // This must be declared before keyword because we use "function" inside the look-forward
        'function-variable': {
            pattern: /[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
            alias: 'function'
        },
        'parameter': [
            {
                pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
                lookbehind: true,
                inside: Prism.languages.javascript
            },
            {
                pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
                inside: Prism.languages.javascript
            },
            {
                pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
                lookbehind: true,
                inside: Prism.languages.javascript
            },
            {
                pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
                lookbehind: true,
                inside: Prism.languages.javascript
            }
        ],
        'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    });

    Prism.languages.insertBefore('javascript', 'string', {
        'template-string': {
            pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|[^\\`])*`/,
            greedy: true,
            inside: {
                'interpolation': {
                    pattern: /\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
                    inside: {
                        'interpolation-punctuation': {
                            pattern: /^\${|}$/,
                            alias: 'punctuation'
                        },
                        rest: Prism.languages.javascript
                    }
                },
                'string': /[\s\S]+/
            }
        }
    });

    if (Prism.languages.markup) {
        Prism.languages.markup.tag.addInlined('script', 'javascript');
    }

    Prism.languages.js = Prism.languages.javascript;

    (function (Prism) {

        /**
         * Returns the placeholder for the given language id and index.
         *
         * @param {string} language
         * @param {string|number} index
         * @returns {string}
         */
        function getPlaceholder(language, index) {
            return '___' + language.toUpperCase() + index + '___';
        }

        Object.defineProperties(Prism.languages['markup-templating'] = {}, {
            buildPlaceholders: {
                /**
                 * Tokenize all inline templating expressions matching `placeholderPattern`.
                 *
                 * If `replaceFilter` is provided, only matches of `placeholderPattern` for which `replaceFilter` returns
                 * `true` will be replaced.
                 *
                 * @param {object} env The environment of the `before-tokenize` hook.
                 * @param {string} language The language id.
                 * @param {RegExp} placeholderPattern The matches of this pattern will be replaced by placeholders.
                 * @param {(match: string) => boolean} [replaceFilter]
                 */
                value: function (env, language, placeholderPattern, replaceFilter) {
                    if (env.language !== language) {
                        return;
                    }

                    var tokenStack = env.tokenStack = [];

                    env.code = env.code.replace(placeholderPattern, function (match) {
                        if (typeof replaceFilter === 'function' && !replaceFilter(match)) {
                            return match;
                        }
                        var i = tokenStack.length;
                        var placeholder;

                        // Check for existing strings
                        while (env.code.indexOf(placeholder = getPlaceholder(language, i)) !== -1)
                            ++i;

                        // Create a sparse array
                        tokenStack[i] = match;

                        return placeholder;
                    });

                    // Switch the grammar to markup
                    env.grammar = Prism.languages.markup;
                }
            },
            tokenizePlaceholders: {
                /**
                 * Replace placeholders with proper tokens after tokenizing.
                 *
                 * @param {object} env The environment of the `after-tokenize` hook.
                 * @param {string} language The language id.
                 */
                value: function (env, language) {
                    if (env.language !== language || !env.tokenStack) {
                        return;
                    }

                    // Switch the grammar back
                    env.grammar = Prism.languages[language];

                    var j = 0;
                    var keys = Object.keys(env.tokenStack);

                    function walkTokens(tokens) {
                        for (var i = 0; i < tokens.length; i++) {
                            // all placeholders are replaced already
                            if (j >= keys.length) {
                                break;
                            }

                            var token = tokens[i];
                            if (typeof token === 'string' || (token.content && typeof token.content === 'string')) {
                                var k = keys[j];
                                var t = env.tokenStack[k];
                                var s = typeof token === 'string' ? token : token.content;
                                var placeholder = getPlaceholder(language, k);

                                var index = s.indexOf(placeholder);
                                if (index > -1) {
                                    ++j;

                                    var before = s.substring(0, index);
                                    var middle = new Prism.Token(language, Prism.tokenize(t, env.grammar), 'language-' + language, t);
                                    var after = s.substring(index + placeholder.length);

                                    var replacement = [];
                                    if (before) {
                                        replacement.push.apply(replacement, walkTokens([before]));
                                    }
                                    replacement.push(middle);
                                    if (after) {
                                        replacement.push.apply(replacement, walkTokens([after]));
                                    }

                                    if (typeof token === 'string') {
                                        tokens.splice.apply(tokens, [i, 1].concat(replacement));
                                    } else {
                                        token.content = replacement;
                                    }
                                }
                            } else if (token.content /* && typeof token.content !== 'string' */) {
                                walkTokens(token.content);
                            }
                        }

                        return tokens;
                    }

                    walkTokens(env.tokens);
                }
            }
        });

    }(Prism));

    /**
     * Original by Aaron Harun: http://aahacreative.com/2012/07/31/php-syntax-highlighting-prism/
     * Modified by Miles Johnson: http://milesj.me
     *
     * Supports the following:
     * 		- Extends clike syntax
     * 		- Support for PHP 5.3+ (namespaces, traits, generators, etc)
     * 		- Smarter constant and function matching
     *
     * Adds the following new token classes:
     * 		constant, delimiter, variable, function, package
     */
    (function (Prism) {
        Prism.languages.php = Prism.languages.extend('clike', {
            'keyword': /\b(?:__halt_compiler|abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|namespace|new|or|parent|print|private|protected|public|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield)\b/i,
            'boolean': {
                pattern: /\b(?:false|true)\b/i,
                alias: 'constant'
            },
            'constant': [
                /\b[A-Z_][A-Z0-9_]*\b/,
                /\b(?:null)\b/i,
            ],
            'comment': {
                pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
                lookbehind: true
            }
        });

        Prism.languages.insertBefore('php', 'string', {
            'shell-comment': {
                pattern: /(^|[^\\])#.*/,
                lookbehind: true,
                alias: 'comment'
            }
        });

        Prism.languages.insertBefore('php', 'comment', {
            'delimiter': {
                pattern: /\?>$|^<\?(?:php(?=\s)|=)?/i,
                alias: 'important'
            }
        });

        Prism.languages.insertBefore('php', 'keyword', {
            'variable': /\$+(?:\w+\b|(?={))/i,
            'package': {
                pattern: /(\\|namespace\s+|use\s+)[\w\\]+/,
                lookbehind: true,
                inside: {
                    punctuation: /\\/
                }
            }
        });

        // Must be defined after the function pattern
        Prism.languages.insertBefore('php', 'operator', {
            'property': {
                pattern: /(->)[\w]+/,
                lookbehind: true
            }
        });

        var string_interpolation = {
            pattern: /{\$(?:{(?:{[^{}]+}|[^{}]+)}|[^{}])+}|(^|[^\\{])\$+(?:\w+(?:\[.+?]|->\w+)*)/,
            lookbehind: true,
            inside: {
                rest: Prism.languages.php
            }
        };

        Prism.languages.insertBefore('php', 'string', {
            'nowdoc-string': {
                pattern: /<<<'([^']+)'(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\1;/,
                greedy: true,
                alias: 'string',
                inside: {
                    'delimiter': {
                        pattern: /^<<<'[^']+'|[a-z_]\w*;$/i,
                        alias: 'symbol',
                        inside: {
                            'punctuation': /^<<<'?|[';]$/
                        }
                    }
                }
            },
            'heredoc-string': {
                pattern: /<<<(?:"([^"]+)"(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\1;|([a-z_]\w*)(?:\r\n?|\n)(?:.*(?:\r\n?|\n))*?\2;)/i,
                greedy: true,
                alias: 'string',
                inside: {
                    'delimiter': {
                        pattern: /^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,
                        alias: 'symbol',
                        inside: {
                            'punctuation': /^<<<"?|[";]$/
                        }
                    },
                    'interpolation': string_interpolation // See below
                }
            },
            'single-quoted-string': {
                pattern: /'(?:\\[\s\S]|[^\\'])*'/,
                greedy: true,
                alias: 'string'
            },
            'double-quoted-string': {
                pattern: /"(?:\\[\s\S]|[^\\"])*"/,
                greedy: true,
                alias: 'string',
                inside: {
                    'interpolation': string_interpolation // See below
                }
            }
        });
        // The different types of PHP strings "replace" the C-like standard string
        delete Prism.languages.php['string'];

        Prism.hooks.add('before-tokenize', function (env) {
            if (!/<\?/.test(env.code)) {
                return;
            }

            var phpPattern = /<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#)(?:[^?\n\r]|\?(?!>))*|\/\*[\s\S]*?(?:\*\/|$))*?(?:\?>|$)/ig;
            Prism.languages['markup-templating'].buildPlaceholders(env, 'php', phpPattern);
        });

        Prism.hooks.add('after-tokenize', function (env) {
            Prism.languages['markup-templating'].tokenizePlaceholders(env, 'php');
        });

    }(Prism));

    Prism.languages.json = {
        'property': {
            pattern: /"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
            greedy: true
        },
        'string': {
            pattern: /"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
            greedy: true
        },
        'comment': /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
        'number': /-?\d+\.?\d*(e[+-]?\d+)?/i,
        'punctuation': /[{}[\],]/,
        'operator': /:/,
        'boolean': /\b(?:true|false)\b/,
        'null': {
            pattern: /\bnull\b/,
            alias: 'keyword'
        }
    };

    Prism.languages.sql = {
        'comment': {
            pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
            lookbehind: true
        },
        'variable': [
            {
                pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
                greedy: true
            },
            /@[\w.$]+/
        ],
        'string': {
            pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
            greedy: true,
            lookbehind: true
        },
        'function': /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i, // Should we highlight user defined functions too?
        'keyword': /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:_INSERT|COL)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURNS?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
        'boolean': /\b(?:TRUE|FALSE|NULL)\b/i,
        'number': /\b0x[\da-f]+\b|\b\d+\.?\d*|\B\.\d+\b/i,
        'operator': /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|IN|LIKE|NOT|OR|IS|DIV|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
        'punctuation': /[;[\]()`,.]/
    };

    Prism.languages.yaml = {
        'scalar': {
            pattern: /([\-:]\s*(?:![^\s]+)?[ \t]*[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)[^\r\n]+(?:\2[^\r\n]+)*)/,
            lookbehind: true,
            alias: 'string'
        },
        'comment': /#.*/,
        'key': {
            pattern: /(\s*(?:^|[:\-,[{\r\n?])[ \t]*(?:![^\s]+)?[ \t]*)[^\r\n{[\]},#\s]+?(?=\s*:\s)/,
            lookbehind: true,
            alias: 'atrule'
        },
        'directive': {
            pattern: /(^[ \t]*)%.+/m,
            lookbehind: true,
            alias: 'important'
        },
        'datetime': {
            pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?)?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?)(?=[ \t]*(?:$|,|]|}))/m,
            lookbehind: true,
            alias: 'number'
        },
        'boolean': {
            pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:true|false)[ \t]*(?=$|,|]|})/im,
            lookbehind: true,
            alias: 'important'
        },
        'null': {
            pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:null|~)[ \t]*(?=$|,|]|})/im,
            lookbehind: true,
            alias: 'important'
        },
        'string': {
            pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)("|')(?:(?!\2)[^\\\r\n]|\\.)*\2(?=[ \t]*(?:$|,|]|}|\s*#))/m,
            lookbehind: true,
            greedy: true
        },
        'number': {
            pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+\.?\d*|\.?\d+)(?:e[+-]?\d+)?|\.inf|\.nan)[ \t]*(?=$|,|]|})/im,
            lookbehind: true
        },
        'tag': /![^\s]+/,
        'important': /[&*][\w]+/,
        'punctuation': /---|[:[\]{}\-,|>?]|\.\.\./
    };

    Prism.languages.yml = Prism.languages.yaml;
})();

(function () {
    var defaultLanguages = [
        { text: 'HTML/XML', value: 'markup' },
        { text: 'JavaScript', value: 'javascript' },
        { text: 'CSS', value: 'css' },
        { text: 'PHP', value: 'php' },
        { text: 'JSON', value: 'json' },
        { text: 'YAML', value: 'yaml' },
        { text: 'SQL', value: 'sql' }
    ];

    function isCodeSample(elm) {
        return elm && elm.nodeName == 'PRE' && elm.className.indexOf('language-') !== -1;
    }

    function setValue(n, value) {
        if (n.nodeName === "SELECT") {
            each(DOM.select('option[value="' + value + '"]', n), function (elm) {
                elm.selected = true;
            });
        } else {
            n.value = value;
        }
    }

    function getValue(n) {
        if (n.nodeName === "SELECT") {
            if (n.options == null || n.selectedIndex === -1) {
                return "";
            }

            return n.options[n.selectedIndex].value;
        }

        return n.value;
    }

    function insertCodeSample(editor, language, code) {
        editor.undoManager.add();

        var node = getSelectedCodeSample(editor);

        if (!code) {
            if (node) {
                editor.dom.remove(node);
            }

            return false;
        }

        code = DOM.encode(code);

        if (node) {
            editor.dom.setAttrib(node, 'class', 'language-' + language);
            node.innerHTML = code;
            Prism.highlightElement(node);
            editor.selection.select(node);
        } else {
            editor.execCommand('mceInsertRawHTML', 0, '<pre id="__new" class="language-' + language + '">' + code + '</pre>');

            var elm = editor.dom.get('__new');
            elm.removeAttribute('id');
            editor.selection.select(elm);
            editor.selection.collapse();
        }
    }

    function getSelectedCodeSample(editor) {
        var node = editor.selection.getNode();

        if (isCodeSample(node)) {
            return node;
        }

        return null;
    }

    function getCurrentCode(editor) {
        var node = getSelectedCodeSample(editor);

        if (node) {
            return node.textContent;
        }

        return '';
    }

    function getCurrentLanguage(editor) {
        var matches, node = getSelectedCodeSample(editor);

        if (node) {
            matches = node.className.match(/language-(\w+)/);
            return matches ? matches[1] : '';
        }

        return '';
    }

    var DOM = tinymce.DOM, each = tinymce.each, grep = tinymce.grep, VK = tinymce.VK;

    tinymce.create('tinymce.plugins.CodeSample', {
        init: function (editor, url) {
            this.editor = editor;
            this.url = url;

            var addedCss, addedScript;

            // Todo: use a proper css loader here
            function loadCss() {
                var linkElm, contentCss = editor.settings.codesample_content_css;

                if (addedCss) {
                    return;
                }

                // flag as complete
                addedCss = true;

                if (contentCss !== false) {
                    linkElm = editor.dom.create('link', {
                        rel: 'stylesheet',
                        href: contentCss ? contentCss : url + '/css/prism.css'
                    });

                    editor.getDoc().getElementsByTagName('head')[0].appendChild(linkElm);
                }
            }

            editor.onPreProcess.add(function (ed, o) {

                var nodes = editor.dom.select('pre[contenteditable=false]', o.node);

                nodes = grep(nodes, function (elm) {
                    return isCodeSample(elm);
                });

                each(nodes, function (elm) {
                    var code = elm.textContent;

                    editor.dom.setAttrib(elm, 'class', tinymce.trim(elm.getAttribute('class')));
                    editor.dom.removeAttrib(elm, 'contentEditable');

                    while (elm.firstChild) {
                        elm.removeChild(elm.firstChild);
                    }

                    var codeElm = editor.dom.create('code');
                    editor.dom.add(elm, codeElm);

                    // Needs to be textContent since innerText produces BR:s
                    codeElm.textContent = code;
                });
            });

            editor.onSetContent.add(function () {
                var unprocessedCodeSamples = grep(editor.dom.select('pre'), function (elm) {
                    return isCodeSample(elm);
                });

                unprocessedCodeSamples = grep(unprocessedCodeSamples, function (elm) {
                    return elm.contentEditable !== "false";
                });

                if (unprocessedCodeSamples.length) {
                    editor.undoManager.add();

                    each(unprocessedCodeSamples, function (elm) {
                        each(editor.dom.select('br', elm), function (el) {
                            el.parentNode.replaceChild(editor.getDoc().createTextNode('\n'), el);
                        });

                        elm.contentEditable = false;
                        elm.innerHTML = editor.dom.encode(elm.textContent);

                        Prism.highlightElement(elm);
                        elm.className = tinymce.trim(elm.className);
                    });
                }
            });

            editor.addCommand('codesample', function () {
                var node = editor.selection.getNode();

                if (editor.selection.isCollapsed() || isCodeSample(node)) {
                    return;
                } else {
                    editor.formatter.toggle('code');
                }
            });

            editor.onInit.add(function () {
                loadCss();

                if (!editor.settings.compress.css) {
                    editor.dom.loadCSS(url + "/css/content.css");
                }
            });

            editor.onNodeChange.add(function (ed, cm, n, co) {
                if (n.nodeName !== "PRE") {
                    n = ed.dom.getParent(n, "PRE");
                }

                var state = isCodeSample(n);

                // clear any existing anchor selections
                ed.dom.removeClass(ed.dom.select('pre[class*="language-"].mce-item-selected'), 'mce-item-selected');

                // set active
                cm.setActive('codesample', state);

                if (state) {
                    ed.dom.addClass(n, 'mce-item-selected');
                    ed.selection.select(n);
                }
            });

            // Remove on backspace or delete
            editor.onKeyDown.add(function (ed, e) {
                if (e.keyCode === VK.BACKSPACE || e.keyCode === VK.DELETE) {
                    var node = ed.selection.getNode();

                    if (isCodeSample(node)) {
                        ed.undoManager.add();
                        ed.dom.remove(node);
                    }
                }
            });

            editor.addButton('codesample', {
                title: 'Codesample',
                onclick: function () {
                    var html = '';

                    html += '<div class="mcePanelRow">';
                    html += '   <label for="' + editor.id + '_codesample_language">' + editor.getLang('codesample.language', 'Language') + '</label>';
                    html += '   <div class="mceModalControl">';
                    html += '       <select id="' + editor.id + '_codesample_language">';

                    each(defaultLanguages, function (item) {
                        html += '   <option value="' + item.value + '">' + item.text + '</option>';
                    });

                    html += '       </select>';
                    html += '   </div>';
                    html += '</div>';

                    html += '<div class="mcePanelRow">';
                    html += '   <label for="' + editor.id + '_codesample_code">' + editor.getLang('codesample.code', 'Code') + '</label>';
                    html += '   <div class="mceModalControl">';
                    html += '       <textarea id="' + editor.id + '_codesample_code" rows="5" autofocus required></textarea>';
                    html += '   </div>';
                    html += '</div>';

                    editor.windowManager.open({
                        title: editor.getLang('codesample.desc', 'Insert Code Sample'),
                        content: html,
                        size: 'mce-modal-landscape-medium',
                        open: function () {
                            var input = DOM.get(editor.id + '_codesample_code');
                            var select = DOM.get(editor.id + '_codesample_language');

                            // reset
                            input.value = '';

                            var label = editor.getLang('insert', 'Insert');

                            var value = getCurrentCode(editor);
                            var lang = getCurrentLanguage(editor);

                            if (value) {
                                input.value = getCurrentCode(editor);
                                label = editor.getLang('update', 'Update');

                                DOM.setHTML(this.id + '_insert', label);
                            }

                            if (lang) {
                                setValue(select, lang);
                            }
                        },
                        buttons: [
                            {
                                title: editor.getLang('common.insert', 'Insert'),
                                id: 'insert',
                                onsubmit: function (e) {
                                    var code = DOM.get(editor.id + '_codesample_code').value;
                                    var language = getValue(DOM.get(editor.id + '_codesample_language'));

                                    if (!code) {
                                        e.cancelSubmit = true;
                                        return;
                                    }

                                    insertCodeSample(editor, language, code);
                                },
                                classes: 'primary',
                                autofocus: true
                            },
                            {
                                title: editor.getLang('common.cancel', 'Cancel'),
                                id: 'cancel'
                            }
                        ]
                    });
                }
            })
        }
    });

    tinymce.PluginManager.add('codesample', tinymce.plugins.CodeSample);
})();
