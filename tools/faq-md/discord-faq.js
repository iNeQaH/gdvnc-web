(function (root) {
  'use strict';

  var PLACE_RE = /\u0000T(\d+)\u0000/g;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function iframeSrc(src) {
    return (
      '<iframe src="' +
      escapeAttr(src) +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe>'
    );
  }

  function youtubeId(url) {
    var m = String(url).match(
      /(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
    );
    return m ? m[1] : null;
  }

  function toEmbed(url) {
    var yt = youtubeId(url);
    if (yt) return iframeSrc('https://www.youtube.com/embed/' + yt);

    var vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeo) return iframeSrc('https://player.vimeo.com/video/' + vimeo[1]);

    var drive = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (drive) return iframeSrc('https://drive.google.com/file/d/' + drive[1] + '/preview');

    var driveOpen = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveOpen) return iframeSrc('https://drive.google.com/file/d/' + driveOpen[1] + '/preview');

    var tiktok = url.match(/tiktok\.com\/@[^/\s]+\/video\/(\d+)/i);
    if (tiktok) return iframeSrc('https://www.tiktok.com/embed/v2/' + tiktok[1]);

    if (/fb\.watch\//i.test(url) || (/facebook\.com\//i.test(url) && /video|watch/i.test(url))) {
      return iframeSrc(
        'https://www.facebook.com/plugins/video.php?href=' +
          encodeURIComponent(url) +
          '&show_text=false&width=560'
      );
    }

    if (/\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(url)) {
      return '<img src="' + escapeAttr(url) + '" alt="">';
    }

    return null;
  }

  function trimUrl(url) {
    return url.replace(/[),.;!?]+$/g, '');
  }

  function restore(s, tokens) {
    var prev;
    do {
      prev = s;
      s = s.replace(PLACE_RE, function (_, i) {
        return tokens[Number(i)] || '';
      });
    } while (s !== prev);
    return s;
  }

  function listMarker(line) {
    var m = line.match(/^(\s*)([*-]|\d+\.)\s+(.*)$/);
    if (!m) return null;
    return {
      indent: m[1].replace(/\t/g, '  ').length,
      ordered: /^\d+\./.test(m[2]),
      text: m[3],
    };
  }

  function isStandaloneUrl(line) {
    return /^\s*https?:\/\/[^\s<]+\s*$/i.test(line);
  }

  function isBlockStart(line) {
    if (!line) return false;
    if (/^\u0000T\d+\u0000\s*$/.test(line)) return true;
    if (/^#{1,3}\s/.test(line)) return true;
    if (/^-#\s/.test(line)) return true;
    if (/^>{1,3}\s?/.test(line) || line === '>>>') return true;
    if (listMarker(line)) return true;
    if (isStandaloneUrl(line)) return true;
    return false;
  }

  function closeListFrame(frame) {
    if (frame.needCloseLi) frame.html += '</li>';
    var tag = frame.ordered ? 'ol' : 'ul';
    return '<' + tag + '>' + frame.html + '</' + tag + '>';
  }

  function renderList(items, formatInline) {
    var stack = [];
    var out = '';

    function closeDeeper(indent) {
      while (stack.length && stack[stack.length - 1].indent > indent) {
        var done = closeListFrame(stack.pop());
        if (stack.length) stack[stack.length - 1].html += done;
        else out += done;
      }
    }

    function closeSameTypeMismatch(item) {
      if (!stack.length) return;
      var top = stack[stack.length - 1];
      if (top.indent === item.indent && top.ordered !== item.ordered) {
        closeDeeper(item.indent - 1);
      }
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      closeDeeper(item.indent);
      closeSameTypeMismatch(item);
      var top = stack[stack.length - 1];
      if (!top || top.indent < item.indent) {
        stack.push({ indent: item.indent, ordered: item.ordered, html: '', needCloseLi: false });
        top = stack[stack.length - 1];
      }
      if (top.needCloseLi) top.html += '</li>';
      top.html += '<li>' + formatInline(item.text);
      top.needCloseLi = true;
    }
    closeDeeper(-1);
    return out;
  }

  function discordToFaqHtml(src) {
    var tokens = [];
    function protect(html) {
      tokens.push(html);
      return '\u0000T' + (tokens.length - 1) + '\u0000';
    }

    src = String(src || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    src = src.replace(/```(?:([\w+-]*)\n)?([\s\S]*?)```/g, function (_, _lang, code) {
      return protect('<pre><code>' + escapeHtml(code.replace(/^\n/, '').replace(/\n$/, '')) + '</code></pre>');
    });

    src = src.replace(/`([^`\n]+)`/g, function (_, code) {
      return protect('<code>' + escapeHtml(code) + '</code>');
    });

    src = src.replace(/<(https?:\/\/[^>\s]+)>/g, function (_, url) {
      return protect('<a href="' + escapeAttr(url) + '">' + escapeHtml(url) + '</a>');
    });

    src = src.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, function (_, text, url) {
      return protect('<a href="' + escapeAttr(url) + '">' + escapeHtml(text) + '</a>');
    });

    function formatInline(raw) {
      raw = raw.replace(/https?:\/\/[^\s<]+/gi, function (url) {
        var u = trimUrl(url);
        var rest = url.slice(u.length);
        return protect('<a href="' + escapeAttr(u) + '">' + escapeHtml(u) + '</a>') + rest;
      });

      return raw
        .split(/(\u0000T\d+\u0000)/)
        .map(function (part) {
          if (part.charAt(0) === '\u0000') return part;
          var t = escapeHtml(part);
          t = t.replace(/\|\|(.+?)\|\|/g, '<span>$1</span>');
          t = t.replace(/__\*\*\*(.+?)\*\*\*__/g, '<u><strong><em>$1</em></strong></u>');
          t = t.replace(/__\*\*(.+?)\*\*__/g, '<u><strong>$1</strong></u>');
          t = t.replace(/__\*(.+?)\*__/g, '<u><em>$1</em></u>');
          t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
          t = t.replace(/__(.+?)__/g, '<u>$1</u>');
          t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          t = t.replace(/~~(.+?)~~/g, '<del>$1</del>');
          t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
          t = t.replace(/(^|[^A-Za-z0-9_])_(?!_)(.+?)_(?![A-Za-z0-9_])/g, '$1<em>$2</em>');
          return t;
        })
        .join('');
    }

    var lines = src.split('\n');
    var blocks = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) {
        i += 1;
        continue;
      }

      var onlyTok = line.match(/^\u0000T(\d+)\u0000\s*$/);
      if (onlyTok) {
        var tok = tokens[Number(onlyTok[1])] || '';
        blocks.push(/^<(pre|iframe|img|ul|ol|h[1-6]|blockquote)\b/i.test(tok) ? line.trim() : '<p>' + line.trim() + '</p>');
        i += 1;
        continue;
      }

      var hm = line.match(/^(#{1,3})\s+(.+)$/);
      if (hm) {
        var level = hm[1].length + 1;
        blocks.push('<h' + level + '>' + formatInline(hm[2].trim()) + '</h' + level + '>');
        i += 1;
        continue;
      }

      if (/^-#\s+/.test(line)) {
        blocks.push('<p><small>' + formatInline(line.replace(/^-#\s+/, '')) + '</small></p>');
        i += 1;
        continue;
      }

      if (line === '>>>' || /^>>>\s/.test(line)) {
        var rest = line === '>>>' ? [] : [line.replace(/^>>>\s?/, '')];
        i += 1;
        while (i < lines.length) {
          rest.push(lines[i]);
          i += 1;
        }
        blocks.push('<blockquote>' + formatInline(rest.join('\n')) + '</blockquote>');
        continue;
      }

      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          q.push(lines[i].replace(/^>\s?/, ''));
          i += 1;
        }
        blocks.push('<blockquote>' + formatInline(q.join('\n')).replace(/\n/g, '<br>') + '</blockquote>');
        continue;
      }

      if (listMarker(line)) {
        var items = [];
        while (i < lines.length && listMarker(lines[i])) {
          items.push(listMarker(lines[i]));
          i += 1;
        }
        blocks.push(renderList(items, formatInline));
        continue;
      }

      if (isStandaloneUrl(line)) {
        var url = trimUrl(line.trim());
        var embed = toEmbed(url);
        blocks.push(embed || '<p><a href="' + escapeAttr(url) + '">' + escapeHtml(url) + '</a></p>');
        i += 1;
        continue;
      }

      var para = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
        para.push(lines[i]);
        i += 1;
      }
      blocks.push('<p>' + formatInline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
    }

    return restore(blocks.join('\n'), tokens).trim();
  }

  root.discordToFaqHtml = discordToFaqHtml;
  root.faqMediaEmbed = toEmbed;
})(typeof window !== 'undefined' ? window : globalThis);
