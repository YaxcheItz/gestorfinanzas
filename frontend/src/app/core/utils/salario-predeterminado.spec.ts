import { salarioPredeterminado } from './salario-predeterminado';
import { Categoria } from '../models/finanzas.models';

describe('Salario predeterminado', () => {
  const categorias = [{id:1,nombre:'Salario',tipo:'INGRESO',activo:true,esPersonalizada:false},
    {id:2,nombre:'Salario',tipo:'INGRESO',activo:true,esPersonalizada:true},
    {id:3,nombre:'Comida',tipo:'GASTO',activo:true}] as Categoria[];
  it('elige una categoria personal unica y no asigna salario a gastos', () => {
    expect(salarioPredeterminado('INGRESO',categorias)).toBe(2);
    expect(salarioPredeterminado('GASTO',categorias)).toBeNull();
    expect(salarioPredeterminado('INGRESO',[{...categorias[1],activo:false}])).toBeNull();
  });
});
