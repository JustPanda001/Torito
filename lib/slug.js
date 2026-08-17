// Turns a trip title into the address it lives at: "Mestia – Ushguli Trek"
// becomes "mestia-ushguli-trek".

// Georgian titles would otherwise strip down to nothing, since none of these
// letters survive an ASCII filter. Standard national romanisation.
const KA_TO_LATIN = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i',
  კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's',
  ტ: 't', უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch',
  ც: 'ts', ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

export function slugify(title) {
  return (title ?? '')
    .toLowerCase()
    .replace(/[Ⴀ-ჿ]/g, (c) => KA_TO_LATIN[c] ?? '')
    // é -> e, ü -> u: split the accent off its letter, then drop the accent
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    // en dashes, ampersands, slashes and the rest all become one separator
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
