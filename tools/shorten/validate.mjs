/* validateShort(original, short): a rewrite is accepted only if it is shorter, plain, and invents nothing.
   "Invents nothing" means every chess move, square, number and mid-sentence name in the rewrite also appears in the original. */
import {normText} from './textkey.mjs';
const SQUARE=/\b[a-h][1-8]\b/g;
const SAN=/\b(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8])(?:=[QRBN])?[+#]?/g;
const NUM=/\b\d+(?:[.,]\d+)?\b/g;
const NAME=/(?<=[a-z,;]\s)[A-Z][a-z]{2,}\b/g;
const set=(t,re)=>new Set((t.match(re)||[]).map(x=>x.replace(/[+#]$/,'')));
const missing=(short,orig,re,ci)=>{
  const o=ci?orig.toLowerCase():orig;
  return [...set(short,re)].filter(x=>!(ci?o.includes(x.toLowerCase()):orig.includes(x)));
};
export const chessTokens=t=>[...set(t,SAN)];
export function validateShort(original,short,opts={}){
  const o=normText(original),s=normText(short);const reasons=[];
  const maxRatio=opts.maxRatio??0.6,maxChars=opts.maxChars??450,minChars=opts.minChars??40;
  if(!s)return{ok:false,reasons:['empty'],text:''};
  if(s.length<minChars)reasons.push('too short to be useful ('+s.length+' chars)');
  if(s.length>maxChars)reasons.push('over '+maxChars+' characters ('+s.length+')');
  if(s.length>o.length*maxRatio)reasons.push('not short enough ('+Math.round(s.length/o.length*100)+'% of the original, limit '+Math.round(maxRatio*100)+'%)');
  if(/[*_`#<>|]|\[\w[^\]]*\]\(/.test(s))reasons.push('contains markdown or HTML characters');
  if(/^(here(?:'s| is)|sure[,!]|rewritten|short version|summary:|tl;dr)/i.test(s))reasons.push('starts with a preamble');
  if(/\b(as an ai|i cannot|i can't|language model)\b/i.test(s))reasons.push('sounds like an assistant, not the coach');
  for(const [label,re,ci] of [['move or square',SAN,false],['number',NUM,false],['name',NAME,true]]){
    const m=missing(s,o,re,ci);if(m.length)reasons.push('adds a '+label+' that is not in the original: '+m.slice(0,4).join(', '));
  }
  return{ok:reasons.length===0,reasons,text:s};
}
