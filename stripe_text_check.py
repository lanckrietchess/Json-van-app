#!/usr/bin/env python3
"""Finds old wording in your Stripe function files (and anything else you point it at) that no longer matches the product.
Usage:  python3 stripe_text_check.py supabase/functions/stripe      (it only READS files, it changes nothing)
Send me the files it flags (usually stripe.js) and I will fix the text and the prices in them."""
import os, re, sys
root = sys.argv[1] if len(sys.argv) > 1 else '.'
RULES = [
 (r'masterclass|opening vault', 'VIP no longer owns the Masterclass or Opening Vault: Pro gets the whole library'),
 (r'exactly the same as pro|same benefits as pro|nothing in the app', 'VIP is Pro plus tokens upfront, the Student title and priority'),
 (r'\b(lifetime|for life|forever)\b', 'only "for as long as the subscription stays active" is allowed'),
 (r'\b(free|cheap)\b.{0,40}(tokens|plan|coach)', 'never call the product free or cheap in marketing'),
 (r'19900|29900|19950|29950|39900|5900|59900|7000|500', 'price / token constants: check they match Pro 399 (founding 199.50), VIP 59 per month or 599 (founding 299.50), 500 tokens a month, 7,000 on yearly VIP'),
]
n = 0
for d, _, files in os.walk(root):
    if 'node_modules' in d or '.git' in d: continue
    for f in files:
        if not re.search(r'\.(js|ts|json|md|html|sql|toml)$', f): continue
        p = os.path.join(d, f)
        try: lines = open(p, encoding='utf8', errors='ignore').read().split('\n')
        except Exception: continue
        for i, l in enumerate(lines, 1):
            for rx, why in RULES:
                if re.search(rx, l, re.I):
                    n += 1; print('%s:%d  [%s]\n    %s' % (p, i, why, l.strip()[:150]))
print('\n%d lines to look at' % n)
