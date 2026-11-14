// Seções da home, na ordem em que aparecem. `index` é a posição entre os filhos de primeiro nível de
// `div.elementor-11` (original) e `main.elementor-11` (Astro); a ordem é a mesma nas duas páginas.
// `ignore` lista propriedades que mudam sozinhas com o tempo ou com a rolagem (movimento de assinatura).
export const SECTIONS = [
  { id: 'hero', index: 0, ignore: ['transform', 'opacity'] }, // fade por rolagem
  { id: 'marquee', index: 1, ignore: ['transform'] }, // faixa animada
  { id: 'protocolo', index: 2, ignore: ['transform', 'opacity'] }, // a foto e os chips entram ao rolar (reveal)
  { id: 'tratamentos', index: 3, ignore: ['transform'] }, // wrapper do Swiper
  { id: 'clinica', index: 4, ignore: ['transform', 'opacity'] }, // passeio guiado pela rolagem
  { id: 'galeria', index: 5, ignore: [] },
  { id: 'resultados', index: 6, ignore: ['transform'] }, // deriva da faixa
  { id: 'doutora', index: 7, ignore: ['transform'] }, // chips flutuantes
  { id: 'faq', index: 8, ignore: [] },
  { id: 'visita', index: 9, ignore: [] },
  { id: 'cta', index: 10, ignore: [] },
  // fora do container da home: o rodapé é irmão do <main>/<div class="elementor-11">; inclui o grão global `.bg`
  { id: 'footer', selector: 'footer.elementor-location-footer', ignore: [] },
];
