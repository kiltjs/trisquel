
import Scope from './scope';

var REsplit = /\$\w*{[^}]*}|{\/}|{:}|{else}/,
    REmatch = /\$(\w*){([^}]*)}|{(\/|:|else)}/g;
    // cmds = require('./cmds');

function raiseList (_this, tokens, cmd, expression, waitingForClose) {
  var token = tokens.shift(),
      targets = { $$content: [], $$otherwise: [] },
      target = '$$content',
      cmds = _this.cmds,
      singleCmd = function (cmds, cmd, expression) {
        return function (data) {
          return cmds[cmd].call(_this, data instanceof Scope ? data : new Scope(data) , expression);
        };
      },
      resolver = function (data) {
        return cmds[cmd].call(_this, data instanceof Scope ? data : new Scope(data), expression, function (s) {
          return targets.$$content.map(function (piece) {
            return piece instanceof Function ? piece(s) : piece;
          }).join('');
        }, function (s) {
          return targets.$$otherwise.map(function (piece) {
            return piece instanceof Function ? piece(s) : piece;
          }).join('');
        });
      };

  while( token !== undefined ) {

    if( typeof token === 'string' ) {
      targets[target].push(token);
    // } else if( token.cmd === 'case' ) {
    //   if( !waitingForClose ) {
    //     throw new Error('template root can not have cases');
    //   }
    //   target = expression.trim();
    } else if( typeof token.cmd === 'string' ) {
      if( token.cmd ) {
        if( !cmds[token.cmd] ) {
          throw new Error('cmd \'' + token.cmd + '\' is not defined');
        }

        if( cmds[token.cmd].$no_content ) {
          targets[target].push(singleCmd(cmds, token.cmd, token.expression));
        } else {
          targets[target].push( raiseList(_this, tokens, token.cmd, token.expression, true) );
        }

      } else {
        targets[target].push(singleCmd(cmds, token.cmd, token.expression));
      }

    } else if( token.expression === ':' || token.expression === 'else' ){
      target = '$$otherwise';
    } else if( token.expression === '/' ) {
      if( !waitingForClose ) {
        throw new Error('can not close root level');
      }
      return resolver;
    } else {
      throw new Error('\'' + token.expression + '\' is not a valid no-cmd expression');
    }

    token = tokens.shift();
  }

  if( waitingForClose ) {
    throw new Error('cmd \'' + cmd + '\' not closed propertly');
  }

  return resolver;
}

function parse (tmpl) {
  if( typeof tmpl !== 'string' ) throw new TypeError('template should be a string');

  var i = 0,
      texts = tmpl.split(REsplit),
      list = [],
      cmds = this.cmds;

  list[i++] = texts.shift();

  tmpl.replace(REmatch,function(match, cmd, expression, altExpression){
    expression = altExpression || expression;

    if( cmd && !cmds[cmd] ) {
      throw new Error('cmd \'' + cmd + '\' is not defined');
    }

    var nextText = texts.shift();

    if( /\{/.test(expression) ) {

      var delta = expression.split('{').length - expression.split('}').length;

      if( delta < 0 ) {
        throw new Error('curly brackets mismatch');
      } else if( delta > 0 ) {
        var tracks = nextText.split('}');

        while( delta > 0 ) {
          if( (tracks.length - 1) < delta ) {
            throw new Error('expression curly brackets mismatch');
          }
          expression += tracks.splice(0, delta).join('}') + '}';
          delta = expression.split('{').length - expression.split('}').length;
        }
        nextText = tracks.join('}');
      }
    }

    list[i++] = { cmd: cmd, expression: expression };
    list[i++] = nextText;
  });

  return raiseList(this, list, 'root');
}

export default parse;

// module.exports = parse;
