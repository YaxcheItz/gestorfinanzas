import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MontoPrivadoDirective } from './monto-privado.directive';
import { PrivacidadService } from '../../core/services/privacidad.service';
@Component({standalone:true,imports:[FormsModule,MontoPrivadoDirective],template:`<input appMontoPrivado type="number" [(ngModel)]="monto">`})
class Formulario { monto = 12.5; }
it('enmascara un monto existente y conserva el enlace numerico al editarlo',()=>{
 TestBed.configureTestingModule({imports:[Formulario]});const fixture=TestBed.createComponent(Formulario);fixture.detectChanges();
 TestBed.inject(PrivacidadService).aplicar(1,true);fixture.detectChanges();
 const input=fixture.nativeElement.querySelector('input');expect(input.type).toBe('password');
 input.value='45.5';input.dispatchEvent(new Event('input'));expect(fixture.componentInstance.monto).toBe(45.5);
 TestBed.inject(PrivacidadService).aplicar(1,false);fixture.detectChanges();expect(input.type).toBe('number');expect(input.value).toBe('45.5');fixture.destroy();
});
