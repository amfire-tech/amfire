"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { askDemoAction, recordDemoViewAction, type DemoChatState } from "../actions";

/** A WhatsApp-style chat with the business's AI salesperson. Reports the view from the browser, so link previews don't count. */
export function DemoChat({ slug, businessName, greeting, sampleQuestions }: { slug: string; businessName: string; greeting: string; sampleQuestions: string[] }) {
  const [state, action, pending] = useActionState<DemoChatState, FormData>(askDemoAction.bind(null, slug), { turns: [] });
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    recordDemoViewAction(slug).catch(() => {});
  }, [slug]);
  useEffect(() => {
    if (input.current) input.current.value = "";
    if (state.turns.length) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state.turns.length]);

  return (
    <div className="overflow-hidden rounded-[1.75rem] bg-[#efeae2] shadow-xl ring-1 ring-black/10">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <div className="grid size-10 place-items-center rounded-full bg-white/20 text-lg font-semibold">{businessName.charAt(0)}</div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{businessName}</p>
          <p className="text-xs text-white/80">AI salesperson · replies instantly, 24×7</p>
        </div>
      </div>

      <div className="h-[26rem] space-y-2 overflow-y-auto px-3 py-4 text-[15px] leading-snug" aria-live="polite">
        <Bubble side="in">{greeting}</Bubble>
        {state.turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <Bubble side="out">{t.q}</Bubble>
            <Bubble side="in">{t.a}</Bubble>
          </div>
        ))}
        {pending && <p className="w-fit rounded-lg rounded-tl-none bg-white px-3 py-2 text-black/50 shadow-sm">typing…</p>}
        <div ref={end} />
      </div>

      {state.turns.length === 0 && sampleQuestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
          {sampleQuestions.map((s) => (
            <form key={s} action={action}>
              <input type="hidden" name="question" value={s} />
              <button className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm whitespace-nowrap text-[#075e54] ring-1 ring-black/10 hover:bg-[#f0f0f0]">{s}</button>
            </form>
          ))}
        </div>
      )}
      {state.error && <p className="px-4 pb-2 text-sm text-[#b42318]">{state.error}</p>}

      <form action={action} className="flex items-center gap-2 bg-[#f0f0f0] px-3 py-2.5">
        <label htmlFor="demo-q" className="sr-only">
          Message
        </label>
        <input
          ref={input}
          id="demo-q"
          name="question"
          required
          maxLength={500}
          autoComplete="off"
          placeholder="Type a message, as a customer would"
          className="min-w-0 flex-1 rounded-full bg-white px-4 py-2.5 text-[15px] text-black ring-1 ring-black/10 placeholder:text-black/40 focus:ring-2 focus:ring-[#25d366] focus:outline-none"
        />
        <SendButton />
      </form>
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: string }) {
  return (
    <p
      className={
        side === "in"
          ? "w-fit max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 whitespace-pre-wrap text-black shadow-sm"
          : "ml-auto w-fit max-w-[85%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 whitespace-pre-wrap text-black shadow-sm"
      }
    >
      {children}
    </p>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-[#25d366] text-white disabled:opacity-60">
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
      </svg>
    </button>
  );
}
