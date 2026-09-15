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
  hasParentSignature = signal(false);
  submitError = signal<string | null>(null);

  padCanvas = viewChild<ElementRef<HTMLCanvasElement>>('padCanvas');
  documentRoot = viewChild('documentRoot', { read: ElementRef<HTMLElement> });
  signatureImage = viewChild<ElementRef<HTMLImageElement>>('signatureImage');

  padCanvasParent = viewChild<ElementRef<HTMLCanvasElement>>('padCanvasParent');
  signatureImageParent = viewChild<ElementRef<HTMLImageElement>>('signatureImageParent');

  private signaturePad?: SignaturePad;
  private signaturePadParent?: SignaturePad;

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
        this.signaturePad = this.setUpPad(canvasRef.nativeElement, empty => this.hasSignature.set(!empty));
      }
    });

    effect(() => {
      const canvasRef = this.padCanvasParent();
      if (canvasRef && !this.signaturePadParent) {
        this.signaturePadParent = this.setUpPad(canvasRef.nativeElement, empty => this.hasParentSignature.set(!empty));
      }
    });
  }

  private setUpPad(canvas: HTMLCanvasElement, onStroke: (empty: boolean) => void): SignaturePad {
    this.resizeCanvas(canvas);
    const pad = new SignaturePad(canvas);
    pad.addEventListener('endStroke', () => onStroke(pad.isEmpty()));
    window.addEventListener('resize', () => {
      this.resizeCanvas(canvas);
      pad.clear();
      onStroke(true);
    });
    return pad;
  }

  private resizeCanvas(canvas: HTMLCanvasElement) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext('2d')!.scale(ratio, ratio);
  }

  clear() {
    this.signaturePad?.clear();
    this.hasSignature.set(false);
  }

  clearParent() {
    this.signaturePadParent?.clear();
    this.hasParentSignature.set(false);
  }

  /**
   * html2pdf.js's DOM-cloning step converts any <canvas> element into a full-size <img>
   * without preserving display:none, so a canvas left at its full pixel size (even blank)
   * becomes a phantom image that breaks the PDF layout. Shrinking to 1x1 avoids that.
   */
  private captureAndShrink(canvas: HTMLCanvasElement, img: HTMLImageElement, pad: SignaturePad): string | null {
    let dataUrl: string | null = null;
    if (!pad.isEmpty()) {
      dataUrl = pad.toDataURL('image/png');
      img.src = dataUrl;
      img.style.display = 'block';
    }
    canvas.style.display = 'none';
    canvas.width = 1;
    canvas.height = 1;
    return dataUrl;
  }

  private async restoreCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement, pad: SignaturePad, dataUrl: string | null) {
    img.style.display = 'none';
    canvas.style.display = 'block';
    this.resizeCanvas(canvas);
    if (dataUrl) {
      await pad.fromDataURL(dataUrl);
    }
  }

  async submit() {
    if (!this.signaturePad || this.signaturePad.isEmpty()) return;
    this.submitError.set(null);
    this.state.set('submitting');

    const canvas = this.padCanvas()!.nativeElement;
    const img = this.signatureImage()!.nativeElement;
    const signatureDataUrl = this.captureAndShrink(canvas, img, this.signaturePad);

    const parentCanvas = this.padCanvasParent()?.nativeElement;
    const parentImg = this.signatureImageParent()?.nativeElement;
    const parentPad = this.signaturePadParent;
    const parentDataUrl = parentCanvas && parentImg && parentPad
      ? this.captureAndShrink(parentCanvas, parentImg, parentPad)
      : null;

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
      await this.restoreCanvas(canvas, img, this.signaturePad, signatureDataUrl);
      if (parentCanvas && parentImg && parentPad) {
        await this.restoreCanvas(parentCanvas, parentImg, parentPad, parentDataUrl);
      }
    }
  }
}
