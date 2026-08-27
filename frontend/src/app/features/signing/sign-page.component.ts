import { Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import SignaturePad from 'signature_pad';
import { PublicAgreement, PublicSigningService } from '../../core/services/public-signing.service';
import { AgreementDocumentComponent } from '../../shared/components/agreement-document/agreement-document.component';

type SignState = 'loading' | 'ready' | 'submitting' | 'success' | 'not_found' | 'already_signed';

@Component({
  selector: 'app-sign-page',
  standalone: true,
  imports: [AgreementDocumentComponent],
  templateUrl: './sign-page.component.html',
  styleUrl: './sign-page.component.scss'
})
export class SignPageComponent {
  private route = inject(ActivatedRoute);
  private signingService = inject(PublicSigningService);

  private token = this.route.snapshot.paramMap.get('token') ?? '';

  state = signal<SignState>('loading');
  agreement = signal<PublicAgreement | null>(null);
  hasSignature = signal(false);
  submitError = signal<string | null>(null);

  padCanvas = viewChild<ElementRef<HTMLCanvasElement>>('padCanvas');
  documentRoot = viewChild('documentRoot', { read: ElementRef<HTMLElement> });
  signatureImage = viewChild<ElementRef<HTMLImageElement>>('signatureImage');

  private signaturePad?: SignaturePad;

  constructor() {
    this.signingService.getAgreement(this.token).subscribe({
      next: agreement => {
        this.agreement.set(agreement);
        this.state.set('ready');
      },
      error: err => this.state.set(err.status === 410 ? 'already_signed' : 'not_found')
    });

    effect(() => {
      const canvasRef = this.padCanvas();
      if (canvasRef && !this.signaturePad) {
        this.signaturePad = new SignaturePad(canvasRef.nativeElement);
        this.signaturePad.addEventListener('endStroke', () => {
          this.hasSignature.set(!this.signaturePad!.isEmpty());
        });
      }
    });
  }

  clear() {
    this.signaturePad?.clear();
    this.hasSignature.set(false);
  }

  async submit() {
    if (!this.signaturePad || this.signaturePad.isEmpty()) return;
    this.submitError.set(null);
    this.state.set('submitting');

    const canvas = this.padCanvas()!.nativeElement;
    const img = this.signatureImage()!.nativeElement;
    img.src = this.signaturePad.toDataURL('image/png');
    img.style.display = 'block';
    canvas.style.display = 'none';

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const pdfBlob: Blob = await html2pdf()
        .set({ margin: 10, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } })
        .from(this.documentRoot()!.nativeElement)
        .outputPdf('blob');

      await new Promise<void>((resolve, reject) => {
        this.signingService.submitSignedPdf(this.token, pdfBlob).subscribe({
          next: () => resolve(),
          error: reject
        });
      });
      this.state.set('success');
    } catch {
      this.submitError.set('משהו השתבש בשליחת החתימה. נסו שוב.');
      this.state.set('ready');
      img.style.display = 'none';
      canvas.style.display = 'block';
    }
  }
}
