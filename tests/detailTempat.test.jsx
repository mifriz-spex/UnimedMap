// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DetailTempat from '../src/components/DetailTempat'

describe('DetailTempat — Gedung terhubung langsung', () => {
  afterEach(cleanup)

  const tempatUtama = {
    id: 'fisika',
    nama: 'Gedung Fisika',
    label: 'Fisika',
    kelompok: 'jurusan',
    fakultas: 'FMIPA',
    gedung: [{ kode: '004' }],
    titik: [10],
    titikSemua: [10],
  }

  const tetangga = {
    id: 'kimia',
    nama: 'Gedung Kimia',
    label: 'Kimia',
    kelompok: 'jurusan',
    fakultas: 'FMIPA',
    gedung: [{ kode: '003' }],
    titik: [20],
    titikSemua: [20],
  }

  const indeks = {
    daftar: [tempatUtama, tetangga],
    byId: new Map([
      ['fisika', tempatUtama],
      ['kimia', tetangga],
    ]),
    byTitik: new Map([
      [10, tempatUtama],
      [20, tetangga],
    ]),
  }

  const graph = {
    10: [{ to: 20, weight: 42 }],
    20: [{ to: 10, weight: 42 }],
  }

  it('menempatkan disclosure di paling bawah, tertutup secara default, dan membuka daftar tetangga saat diklik', async () => {
    const user = userEvent.setup()
    const onBuka = vi.fn()

    render(
      <DetailTempat
        tempat={tempatUtama}
        indeks={indeks}
        graph={graph}
        ruangan={[
          { id: 'r1', tempatId: 'fisika', nama: 'Ruang Kuliah 1', lantai: 1, alias: '', kodeTampil: '004.1.01' },
        ]}
        aturan={null}
        onKembali={() => {}}
        onRuteKe={() => {}}
        onRuteDari={() => {}}
        onBuka={onBuka}
        onPilihRuangan={() => {}}
      />
    )

    const toggle = screen.getByRole('button', { name: 'Gedung terhubung langsung (1)' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.className).toContain('min-h-[44px]')
    expect(screen.queryByRole('button', { name: /Kimia/ })).toBeNull()

    // Pastikan berada di paling bawah artikel (setelah daftar ruangan per lantai)
    const artikel = screen.getByRole('article', { name: 'Rincian Gedung Fisika' })
    const sectionTerhubung = screen.getByRole('region', { name: 'Gedung terhubung langsung' })
    expect(artikel.lastElementChild).toBe(sectionTerhubung)

    await user.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const tombolTetangga = screen.getByRole('button', { name: /Kimia\s*·\s*42 m/ })
    await user.click(tombolTetangga)
    expect(onBuka).toHaveBeenCalledWith('kimia')
  })
})
