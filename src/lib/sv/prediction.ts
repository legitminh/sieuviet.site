// Completion suggestions for the testing ground. The phrase index is built once;
// each lookup is a single pass, and callers run it off the typing path (idle time).
const source: [string, number][] = [
  ['xin',1800], ['xin chào',1200], ['xin cảm ơn',1120], ['xin lỗi',1180], ['xinh',820],
  ['xuống',800], ['xuân',760], ['xuất',750], ['xong',900], ['xem',880], ['xác nhận',930],
  ['xử lý',850], ['sinh nhật',1250], ['chúc mừng sinh nhật',1600], ['chúc mừng',1250],
  ['cảm ơn',1500], ['cảm ơn bạn',1550], ['không',1500], ['không sao',1380],
  ['không có gì',1450], ['được',1450], ['được rồi',1420], ['đồng ý',1150], ['tôi',1500],
  ['tôi nghĩ',1330], ['tôi muốn',1370], ['tôi sẽ',1320], ['mình',1420], ['mình sẽ',1300],
  ['mình nghĩ',1270], ['bạn',1450], ['bạn có',1250], ['có',1480], ['có thể',1420],
  ['có lẽ',1190], ['rất',1300], ['rất vui',1180], ['vui lòng',1320], ['vui lòng cho',1260],
  ['cho',1410], ['cho tôi',1350], ['cho mình',1220], ['và',1460], ['nhưng',1250],
  ['vì',1260], ['vì vậy',1230], ['nếu',1240], ['nếu bạn',1220], ['khi',1220], ['trong',1370],
  ['trong đó',1210], ['một',1430], ['một cách',1190], ['những',1340], ['các',1400],
  ['này',1280], ['đó',1260], ['hôm nay',1360], ['ngày mai',1310], ['hôm qua',1180],
  ['bây giờ',1300], ['sau đó',1230], ['ở',1360], ['ở đây',1320], ['đi',1220], ['đến',1320],
  ['về',1340], ['làm',1390], ['làm việc',1340], ['thời gian',1280], ['công việc',1300],
  ['gia đình',1250], ['việt nam',1290], ['tiếng việt',1270], ['thông tin',1280], ['vấn đề',1270],
  ['giải quyết',1210], ['phát triển',1210], ['hệ thống',1200], ['ứng dụng',1190],
  ['cập nhật',1230], ['hoàn thành',1210], ['thành công',1240], ['tuyệt vời',1160],
  ['chào buổi sáng',1220], ['chào buổi tối',1150], ['hẹn gặp lại',1250], ['chúc ngủ ngon',1200],
  ['mừng sinh nhật',1310], ['sức khỏe',1180], ['yêu',1190], ['thích',1260], ['muốn',1320],
  ['cần',1360], ['biết',1350], ['hiểu',1240], ['thấy',1320], ['nói',1340], ['gửi',1260], ['nhận',1240]
];

interface Candidate { text: string; lower: string; preceding: string[]; weight: number; phrase: boolean }
const lower = (text: string) => text.normalize('NFC').toLocaleLowerCase('vi');
const index: Candidate[] = source.flatMap(([text, weight]) => {
  const words = text.normalize('NFC').split(' ');
  return words.map((_, start) => {
    const candidate = words.slice(start).join(' ');
    return { text: candidate, lower: lower(candidate), preceding: words.slice(0, start).map(lower), weight, phrase: start > 0 };
  });
});
const singles = source.filter(([text]) => !text.includes(' '));

function words(text: string): string[] { return text.split(/[^\p{L}]+/u).filter(Boolean); }
function matchedContext(context: string[], preceding: string[]): number {
  let count = 0;
  while (count < context.length && count < preceding.length &&
    context[context.length - 1 - count] === preceding[preceding.length - 1 - count]) count++;
  return count;
}

/** The rest of the word or phrase after `prefix`, best first. Only the last few context words matter. */
export function predict(context: string, prefix: string, limit = 12): string[] {
  const normalizedPrefix = lower(prefix);
  let base = lower(context.slice(-160));
  if (normalizedPrefix && base.endsWith(normalizedPrefix)) base = base.slice(0, -normalizedPrefix.length);
  const contextWords = words(base).slice(-4);
  const best = new Map<string, number>();
  for (const entry of index) {
    if (!entry.lower.startsWith(normalizedPrefix)) continue;
    const matched = matchedContext(contextWords, entry.preceding);
    if (!normalizedPrefix && matched === 0) continue;
    if (entry.phrase && matched < 1) continue;
    const suffix = entry.text.slice(normalizedPrefix.length);
    if (!suffix) continue;
    const contextual = matched * 5000 + (matched === entry.preceding.length && matched > 0 ? 2500 : 0);
    const phrasePenalty = matched === 0 ? (suffix.match(/ /g)?.length ?? 0) * 700 : 0;
    const score = entry.weight + contextual - [...suffix].length - phrasePenalty;
    best.set(suffix, Math.max(best.get(suffix) ?? -Infinity, score));
  }
  if (!normalizedPrefix && best.size === 0) for (const [text, weight] of singles) best.set(text, weight - [...text].length);
  const hasSingle = [...best.keys()].some((candidate) => !candidate.includes(' '));
  return [...best.entries()].sort(([a, aScore], [b, bScore]) => {
    if (hasSingle && a.includes(' ') !== b.includes(' ')) return a.includes(' ') ? 1 : -1;
    return bScore - aScore || a.localeCompare(b, 'vi');
  }).slice(0, limit).map(([candidate]) => candidate);
}
