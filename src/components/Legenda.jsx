import { KELOMPOK, URUTAN_KELOMPOK } from '../lib/peta'
import { IkonBawah } from './Ikon'

export default function Legenda() {
  return (
    <details className="group pointer-events-auto absolute bottom-6 left-2 z-[1000] max-w-[19rem] rounded-xl border border-slate-200/80 bg-white/95 text-xs text-slate-800 shadow-md backdrop-blur-xs md:bottom-7">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 select-none rounded-xl px-3 py-2 font-semibold text-slate-900 hover:bg-slate-50">
        <span>Keterangan warna</span>
        <span className="text-slate-500 transition-transform duration-200 group-open:rotate-180">
          <IkonBawah ukuran={15} />
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