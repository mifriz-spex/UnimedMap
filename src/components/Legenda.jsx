import { KELOMPOK, URUTAN_KELOMPOK } from '../lib/peta'
import { IkonBawah } from './Ikon'

export default function Legenda() {
  return (
    <details className="peta-kontrol-bawah group pointer-events-auto absolute bottom-[calc(var(--bottom-sheet-height,35dvh)+0.75rem+env(safe-area-inset-bottom,0px))] left-2.5 z-[1000] max-w-[18rem] rounded-xl border border-slate-200/90 bg-white text-xs text-[#0F172A] shadow-[0_2px_10px_rgba(15,23,42,0.12)] transition-[bottom,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:bottom-7 md:left-2.5">
      <summary className="min-h-[44px] flex cursor-pointer list-none items-center justify-between gap-2 select-none rounded-xl px-3.5 py-2.5 font-semibold text-[#0F172A] hover:bg-slate-50 active:bg-slate-100">
        <span>Keterangan warna</span>
        <span className="text-slate-500 transition-transform duration-200 group-open:rotate-180">
          <IkonBawah ukuran={16} />
        </span>
      </summary>
      <div className="border-t border-slate-100 px-3 pt-2.5 pb-3">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {URUTAN_KELOMPOK.filter((k) => KELOMPOK[k]).map((k) => (
            <li key={k} className="flex items-center gap-1.5 truncate">
              <span
                className="h-3 w-3 flex-none rounded-sm border"
                style={{
                  background: `${KELOMPOK[k].warna}33`,
                  borderColor: KELOMPOK[k].warna,
                }}
              />
              <span className="truncate">{KELOMPOK[k].nama}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2">
          <div className="flex items-center gap-2">
            <span className="h-1 w-5 flex-none rounded bg-blue-600" />
            <span>Rute yang disarankan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1 w-5 flex-none rounded bg-slate-400" />
            <span>Jalur jalan kaki</span>
          </div>
        </div>
      </div>
    </details>
  )
}