# Prices USD per 1M tokens, official pages accessed 2026-10-20.
models = {
  # name: (batch_in, batch_out, batch_cache_read or None)
  "Claude Haiku 5.5 (batch)":   (0.05, 0.25, 0.005),
  "Claude Sonnet 5.5 (batch)":  (1.00, 5.00, 0.05),
  "Claude Haiku 5.5 (standard)":(0.10, 0.50, 0.01),
  "gpt-5-nano (batch)":         (0.025, 0.20, 0.0025),
  "gpt-5.4-nano (batch)":       (0.10, 0.625, 0.01),
  "gpt-5.4-mini (batch)":       (0.375, 2.25, 0.0375),
  "Gemini 3.1 Flash-Lite (batch)": (0.125, 0.75, 0.0125),
  "Gemini 3.6 Flash (batch)":   (0.375, 1.875, 0.0375),
}
T_SYS, T_META, K, M, T_OUT = 2000, 500, 20, 150, 600
T_VAR = T_META + K*M
def per_title(p_in, p_out, p_cr, think, cache):
    sys_cost = T_SYS*(p_cr if (cache and p_cr is not None) else p_in)
    return (T_VAR*p_in + sys_cost + (T_OUT+think)*p_out)/1e6
print(f"T_var={T_VAR}, T_sys={T_SYS}, T_out={T_OUT}")
for name,(pi,po,pc) in models.items():
    lo = per_title(pi,po,pc,0,True)      # all system-prompt reads are cache hits, no thinking
    hi = per_title(pi,po,pc,1000,False)  # no cache hits, 1000 thinking tokens
    base = per_title(pi,po,pc,0,False)
    print(f"{name:32s} per title: low ${lo:.6f} base ${base:.6f} high ${hi:.6f} | "
          f"10k: ${lo*1e4:,.2f}-{hi*1e4:,.2f} | 100k: ${lo*1e5:,.2f}-{hi*1e5:,.2f} | 500k: ${lo*5e5:,.2f}-{hi*5e5:,.2f}")
# runtime per session, Haiku 5.5 standard and Sonnet 5.5 standard
def session(p_in,p_out,p_cr, parses=8, expl=2):
    parse = 100*p_in + 1500*p_cr + 150*p_out
    ex = 2000*p_in + 400*p_out
    return (parses*parse + expl*ex)/1e6
print("session Haiku 5.5 std:", round(session(0.10,0.50,0.01),5))
print("session Sonnet 5.5 std:", round(session(2.0,10.0,0.10),5))
