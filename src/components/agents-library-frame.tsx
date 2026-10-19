/*
 * The page area of Figma "Frame 2147206359", exactly: a white header block (p 40, gap 12, #ECEBE9 line under it)
 * with the title (Geist Medium 20, line height 16, #121212) and the description (Geist 14/16, #6C6A68),
 * four 12px white squares with a #DDDCDA edge at the frame's own positions, and empty white space below.
 * Positions are relative to the area right of the sidebar, top bar included (the squares sit on the two lines).
 */
export function AgentsLibraryFrame() {
  return (
    <div className="flex flex-col items-start bg-white whitespace-nowrap">
      <div className="flex w-full flex-col items-start justify-center gap-3 border-b border-[#ecebe9] bg-white p-10">
        <p className="text-[1.25rem] leading-4 font-medium text-[#121212]">Agents Library</p>
        <p className="text-[0.875rem] leading-4 font-normal text-[#6c6a68]">
          Ready-made security agents by Rival. Pick one, make it yours in a short chat, and it joins My Agents.
        </p>
      </div>
    </div>
  )
}

// The four squares, placed against the area right of the sidebar (left -1 / 1712 / 1713 at a 1724px wide area)
export function FrameCorners() {
  const sq = "absolute size-3 border border-[#dddcda] bg-white"
  return (
    <>
      <div aria-hidden className={sq} style={{ left: -1, top: "10.4375rem" }} />
      <div aria-hidden className={sq} style={{ left: -1, top: "2.625rem" }} />
      <div aria-hidden className={sq} style={{ right: 0, top: "2.625rem" }} />
      <div aria-hidden className={sq} style={{ right: -1, top: "10.4375rem" }} />
    </>
  )
}
