import { Link } from 'react-router-dom'
import { Github, Download } from 'lucide-react'

/**
 * Technical write-up: how Daybreak's blindspot detection works.
 *
 * Every number on this page came from a real run against the live archive
 * rather than an estimate. If the algorithm in daily-news/cluster.py changes,
 * the figures in STATS and the thresholds quoted in the prose need rechecking.
 */

const STATS = [
  { value: '1,500', label: 'headlines in a three-day window' },
  { value: '43', label: 'sources across the spectrum' },
  { value: '115', label: 'stories found in them' },
  { value: '22 ms', label: 'to cluster the lot' },
]

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 dark:bg-black/60 text-gray-100 rounded-xl p-5 overflow-x-auto
                    text-sm leading-relaxed border border-gray-800">
      <code>{children}</code>
    </pre>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-3 text-2xl font-bold font-display text-gray-900 dark:text-white">
        <span className="w-9 h-9 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500
                         text-white text-base flex items-center justify-center font-mono">
          {n}
        </span>
        {title}
      </h2>
      <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
    </section>
  )
}

export default function Clustering() {
  return (
    <article className="max-w-3xl mx-auto py-10 space-y-14">

      {/* header */}
      <header className="space-y-5">
        <h1 className="text-4xl sm:text-5xl font-bold font-display text-gray-900 dark:text-white leading-tight">
          Finding blindspots without AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
          Daybreak tells you which stories one side of the spectrum is covering and the other is
          ignoring. Doing that means first working out which articles are about the same event.
          Here is how it groups 1,500 headlines into stories in 22 milliseconds, on your own
          machine, with no model involved.
        </p>
        <div className="h-1.5 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500" />
      </header>

      {/* live numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="text-2xl font-bold font-display text-gray-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">The actual problem</h2>
        <p>
          A blindspot is a story that two or more left-leaning outlets are covering while no
          right-leaning outlet has touched it, or the reverse. You cannot detect that until you
          know which of the day's articles are the same story, and the wire gives you no help.
          The same event arrives as three different sentences:
        </p>
        <Code>{`AP        Man carrying ammunition arrested near Trump golf club
CBS News  Man carrying ammunition arrested near Trump National
          Golf Club before president's visit
NPR       Armed suspect detained ahead of presidential visit to
          Los Angeles County club`}</Code>
        <p>
          No shared ID, no shared tag, no shared URL. So the whole feature reduces to one
          question asked about a million times a morning: are these two headlines the same story?
        </p>
      </section>

      <section className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Why not just use a model</h2>
        <p>
          Sentence embeddings would answer that question well. They would also mean shipping a
          model with the app or sending every headline you read to somebody's server, and the
          entire point of Daybreak is that your reading never leaves the machine. There is no
          account, no API key, and nothing to phone home to.
        </p>
        <p>
          The practical case is just as strong. The app is a 28 MB download; an embedding model
          is bigger than the app it would live in. It has to work with no internet beyond the
          feed fetch, and it has to finish fast enough that opening the Blindspots tab feels
          instant. What follows costs 22 milliseconds and no dependencies.
        </p>
      </section>

      <Step n={1} title="Read the headline, ignore the summary">
        <p>
          Every article is reduced to a set of lowercase words at least three characters long,
          minus a stoplist. Titles only.
        </p>
        <Code>{`def _tokens(article):
    text = article.get("title", "").lower()
    return {t for t in _WORD.findall(text)
            if len(t) >= 3 and t not in STOPWORDS}`}</Code>
        <p>
          Feeding in the RSS description as well seems obviously better and makes the results
          worse. Summaries are padded with generic language, and words like "another", "month"
          and "social" are shared by articles with nothing in common. Those weak links chain
          unrelated stories together until half the day collapses into one blob. Headlines are
          written to compress an event into ten words, so they are almost entirely names, places
          and verbs. That is the signal.
        </p>
      </Step>

      <Step n={2} title="Rare words count for more">
        <p>
          Two articles sharing the word "police" tells you nothing. Two sharing "Bellingcat"
          tells you a great deal. Each word is weighted by how rare it is across the whole
          window, the standard inverse document frequency:
        </p>
        <Code>{`idf = {t: math.log(n / c) for t, c in df.items()}`}</Code>
        <p>
          A word in 2 of 1,500 articles scores about 6.6. A word in 400 of them scores about
          1.3. Matching on the first is evidence; matching on the second is background noise.
        </p>
      </Step>

      <Step n={3} title="Only compare articles that could possibly match">
        <p>
          Comparing all 1,500 articles to each other is 1,124,250 pairs, and almost every one of
          them scores zero. Instead the words themselves index the articles, and only articles
          that share a word ever get scored. A word has to appear in at least 2 articles to link
          anything at all, and in no more than 12 to still be about one story:
        </p>
        <Code>{`for i, ts in enumerate(toks):
    for t in ts:
        if df_min <= df[t] <= df_max:   # 2 to 12
            inverted[t].append(i)`}</Code>
        <p>
          The upper bound is the interesting one. A word in 40 different articles is not
          identifying a story, it is identifying a topic. "Ukraine" appears across a dozen
          unrelated Ukraine stories, and letting it link them would merge them all into a single
          fake mega-story. Capping the band keeps the linking words specific.
        </p>
      </Step>

      <Step n={4} title="Two thresholds, not one">
        <p>
          Each surviving pair accumulates the combined rarity of every word it shares, and a
          count of how many words that was. It takes both to make a link:
        </p>
        <Code>{`if s >= min_score and pair_shared[key] >= min_shared:
    uf.union(*key)                       # 14.0 and 2`}</Code>
        <p>
          The score alone is not enough, because one sufficiently rare word can clear 14.0 by
          itself, and a single coincidence does happen: an unusual surname turning up in two
          genuinely unrelated stories. Requiring two independent rare words to agree makes that
          coincidence much less likely. The score alone measures strength; the count measures
          whether the evidence is corroborated.
        </p>
      </Step>

      <Step n={5} title="Let the links form the groups">
        <p>
          Links are pairwise, but stories are not. If the AP piece links to the CBS piece and
          the CBS piece links to the NPR piece, all three are one story even though AP and NPR
          may share almost no wording. That is a union-find, which merges connected pairs into
          groups in near-linear time and never needs to be told how many stories exist today:
        </p>
        <Code>{`def find(self, x):
    while self.parent[x] != x:
        self.parent[x] = self.parent[self.parent[x]]  # path compression
        x = self.parent[x]
    return x`}</Code>
        <p>
          Transitivity is also the danger. One bad link welds two real stories together
          permanently, and a few bad links cascade into the blob. This is why the thresholds are
          set conservatively: it is better to miss a match than to merge two stories. It holds up
          in practice. In the window measured for this page the largest of the 115 clusters was
          8 articles from 7 different outlets, which is what a single well-covered story
          actually looks like.
        </p>
      </Step>

      <Step n={6} title="Then the blindspot rule is trivial">
        <p>
          With real stories in hand, the feature everything was built for is a counting exercise.
          For each story, count the <em>distinct outlets</em> on each side. Two or more on the
          left with zero on the right means the right is missing it:
        </p>
        <Code>{`if L >= min_side and R == 0:      # 2+ left sources, no right
    rep = _representative(articles, idxs, LEFT_SIDE)
elif R >= min_side and L == 0:
    rep = _representative(articles, idxs, RIGHT_SIDE)`}</Code>
        <p>
          Counting outlets rather than articles matters: one outlet filing five updates on its
          own scoop should not register as a blindspot. Center coverage deliberately does not
          disqualify a story, because the claim being made is about the imbalance between left
          and right, not about whether anyone at all reported it.
        </p>
        <p>
          One clustering pass runs per fetch and is cached, then shared by three features:
          Blindspots, the read-across that shows you the same story from the other side, and the
          Hot list of most-covered stories you have not read yet. They are three views of the
          same 22 milliseconds of work.
        </p>
      </Step>

      <section id="limits" className="space-y-4 scroll-mt-24">
        <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Where it falls down</h2>
        <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            It is word overlap, so it fails in exactly the ways word overlap fails, and it is
            worth being straight about that.
          </p>
          <ul className="space-y-3 list-disc pl-5 marker:text-orange-500">
            <li>
              <strong className="text-gray-900 dark:text-white">Heavy rewrites slip through.</strong>{' '}
              Two outlets covering one event in genuinely different language, with different
              names in the headline, will not link. Those stories are simply missed rather than
              flagged, which is the failure mode I would pick if I had to pick one.
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">Names collide.</strong> Two
              unrelated stories about different people who share a distinctive surname can
              still link if they also share a second rare word. Rarer than it used to be, not
              impossible.
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">It has no idea what words mean.</strong>{' '}
              "Apple" the company and "apple" the fruit are the same token. There is no
              synonym handling, so "protest" and "demonstration" are unrelated as far as it is
              concerned.
            </li>
            <li>
              <strong className="text-gray-900 dark:text-white">The lean is per outlet, not per article.</strong>{' '}
              Every source carries one hand-checked rating on a five-point scale, and every
              article inherits it. A genuinely down-the-middle piece published by a
              left-leaning outlet still counts as left. That is a real limitation of the
              blindspot numbers and not something clustering can fix.
            </li>
          </ul>
          <p>
            None of that stops it doing the job. In the window measured above it surfaced 27
            stories the right was not covering and 11 the left was not, which is a genuinely
            useful morning's reading, produced entirely on-device from about 200 lines of
            Python.
          </p>
        </div>
      </section>

      {/* footer links */}
      <footer className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-5">
        <p className="text-gray-600 dark:text-gray-300">
          The whole thing is in <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800
          text-sm text-gray-800 dark:text-gray-200">cluster.py</code>, and the app it powers is a
          free Windows download.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="https://github.com/Ragnr99/daily-news/blob/master/cluster.py"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 bg-gray-800 dark:bg-gray-700 text-white
                       rounded-lg font-medium hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
          >
            <Github size={18} /> Read cluster.py
          </a>
          <Link
            to="/daybreak"
            className="inline-flex items-center gap-2 px-5 py-3 bg-orange-600 dark:bg-orange-500 text-white
                       rounded-lg font-medium hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
          >
            <Download size={18} /> Get Daybreak
          </Link>
        </div>
      </footer>
    </article>
  )
}
