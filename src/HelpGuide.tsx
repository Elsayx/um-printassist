import { Check, FileText, ScanLine, SlidersHorizontal } from 'lucide-react'
import { t } from './i18n'

export default function HelpGuide() {
  const steps = [
    { icon: FileText, title: 'Choose a document', body: 'Open a PDF, JPG or PNG, or try a sample. Your file stays in this browser.' },
    { icon: SlidersHorizontal, title: 'Set up the printout', body: 'Choose paper, color, copies and print sides. Use Layout & pages to place several pages on one side.' },
    { icon: ScanLine, title: 'Inspect both sides', body: 'Use Physical sheet to check the front and back of every sheet. Use Original to inspect a source page.' },
    { icon: Check, title: 'Review and submit', body: 'Check the sheet count and settings, then submit the simulated job. Find the receipt under Print jobs.' },
  ]
  return (
    <section className="pa-help-guide" aria-labelledby="help-steps-title">
      <h3 id="help-steps-title">{t('From document to print job')}</h3>
      <ol className="pa-help-steps">
        {steps.map(({ icon: Icon, title, body }, index) => (
          <li key={title}>
            <span className="pa-help-step-number" aria-hidden="true">{index + 1}</span>
            <div><h4><Icon size={17} aria-hidden="true" />{t(title)}</h4><p>{t(body)}</p></div>
          </li>
        ))}
      </ol>
      <figure className="pa-sheet-guide">
        <figcaption>{t('Pages, sides and sheets')}</figcaption>
        <div className="pa-sheet-example" aria-hidden="true">
          <div><span>{t('Front')}</span><div className="pa-mini-sheet"><i>1</i><i>2</i><i>3</i><i>4</i></div></div>
          <span className="pa-sheet-turn">↔</span>
          <div><span>{t('Back')}</span><div className="pa-mini-sheet"><i>5</i><i>6</i><i>7</i><i>8</i></div></div>
        </div>
        <p>{t('Example: 8 source pages, 4 pages per side, two-sided printing = 1 physical sheet. Pages 1–4 are on the front; pages 5–8 are on the back.')}</p>
        <p>{t('A source page is a page in your file. A side is one face of the paper. A sheet is one piece of paper, with a front and a back.')}</p>
      </figure>
    </section>
  )
}
