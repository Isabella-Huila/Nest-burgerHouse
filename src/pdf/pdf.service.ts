import { Injectable } from '@nestjs/common';
import { CreatePdfDto } from './dto/create-pdf.dto';
import { UpdatePdfDto } from './dto/update-pdf.dto';
import { SalesReport } from '../report/report.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {
  async generateReport(temporarity: string, data: SalesReport): Promise<{ base64: string }>  {
    return new Promise((resolve, reject) => {
      try {
        // Crear nuevo documento PDF
        const doc = new PDFDocument({ margin: 50 });
        
        // Buffer para almacenar el PDF en memoria
        const buffers: Buffer[] = [];
        
        // Capturar los datos del PDF en el buffer
        doc.on('data', (chunk) => buffers.push(chunk));
        
        doc.on('end', () => {
          // Combinar todos los chunks en un solo buffer
          const pdfBuffer = Buffer.concat(buffers);
          
          // Convertir a base64#
          const base64Pdf = pdfBuffer.toString('base64');
          
          resolve({base64:base64Pdf});
        });

        doc.on('error', (err) => {
          reject(err);
        });

        // Generar contenido del PDF
        this.generatePdfContent(doc, temporarity, data);
        
        // Finalizar el documento
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private generatePdfContent(doc: PDFKit.PDFDocument, temporarity: string, data: SalesReport) {
    // Configurar fuentes y colores
    const primaryColor = '#fc6c04';
    const secondaryColor = '#64748b';
    const headerHeight = 80;

    // Header con título
    doc.rect(0, 0, doc.page.width, headerHeight)
       .fill(primaryColor);

    doc.fillColor('white')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('Reporte de Ventas', 50, 30);

    doc.fontSize(12)
       .text(`Período: ${this.capitalizeFirst(temporarity)}`, 50, 55);

    // Resetear color para el contenido
    doc.fillColor('black');

    let yPosition = headerHeight + 40;

    // Información del período
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Información del Período', 50, yPosition);

    yPosition += 25;

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Fecha de inicio: ${this.formatDate(data.startDate)}`, 50, yPosition);

    yPosition += 20;

    doc.text(`Fecha de fin: ${this.formatDate(data.endDate)}`, 50, yPosition);

    yPosition += 20;

    doc.text(`Temporalidad: ${this.capitalizeFirst(temporarity)}`, 50, yPosition);

    yPosition += 40;

    // Sección de productos top
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text('Productos Más Vendidos', 50, yPosition);

    yPosition += 30;

    // Headers de la tabla
    const tableHeaders = ['#', 'Producto', 'Precio', 'Cantidad', 'Ingresos'];
    const columnWidths = [30, 200, 80, 80, 100];
    const tableStartX = 50;
    let currentX = tableStartX;

    // Dibujar headers de la tabla
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(primaryColor);

    tableHeaders.forEach((header, index) => {
      doc.text(header, currentX, yPosition, { width: columnWidths[index] });
      currentX += columnWidths[index];
    });

    yPosition += 20;

    // Línea separadora
    doc.strokeColor(secondaryColor)
       .lineWidth(1)
       .moveTo(tableStartX, yPosition)
       .lineTo(tableStartX + columnWidths.reduce((a, b) => a + b, 0), yPosition)
       .stroke();

    yPosition += 10;

    // Datos de los productos
    doc.fillColor('black')
       .font('Helvetica')
       .fontSize(9);

    data.topProducts.forEach((product, index) => {
      // Verificar si necesitamos una nueva página
      if (yPosition > doc.page.height - 100) {
        doc.addPage();
        yPosition = 50;
      }

      currentX = tableStartX;

      // Número de fila
      doc.text(`${index + 1}`, currentX, yPosition, { width: columnWidths[0] });
      currentX += columnWidths[0];

      // Título del producto (truncar si es muy largo)
      const truncatedTitle = product.title.length > 30 
        ? product.title.substring(0, 27) + '...' 
        : product.title;
      doc.text(truncatedTitle, currentX, yPosition, { width: columnWidths[1] });
      currentX += columnWidths[1];

      // Precio
      doc.text(`$${product.price.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 
               currentX, yPosition, { width: columnWidths[2], align: 'right' });
      currentX += columnWidths[2];

      // Cantidad
      doc.text(product.count.toString(), currentX, yPosition, { width: columnWidths[3], align: 'right' });
      currentX += columnWidths[3];

      // Ingresos totales
      doc.text(`$${product.totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 
               currentX, yPosition, { width: columnWidths[4], align: 'right' });

      yPosition += 20;

      // Línea separadora ligera cada 5 filas
      if ((index + 1) % 5 === 0) {
        doc.strokeColor('#e2e8f0')
           .lineWidth(0.5)
           .moveTo(tableStartX, yPosition - 5)
           .lineTo(tableStartX + columnWidths.reduce((a, b) => a + b, 0), yPosition - 5)
           .stroke();
      }
    });

    // Resumen final
    yPosition += 30;

    if (yPosition > doc.page.height - 150) {
      doc.addPage();
      yPosition = 50;
    }

    // Calcular totales
    const totalProducts = data.topProducts.length;
    const totalQuantity = data.topProducts.reduce((sum, product) => sum + product.count, 0);
    const totalRevenue = data.topProducts.reduce((sum, product) => sum + product.totalRevenue, 0);

    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor(primaryColor)
       .text('Resumen', 50, yPosition);

    yPosition += 25;

    doc.fontSize(11)
       .font('Helvetica')
       .fillColor('black')
       .text(`Total de productos diferentes: ${totalProducts}`, 50, yPosition);

    yPosition += 18;

    doc.text(`Cantidad total vendida: ${totalQuantity.toLocaleString('es-CO')}`, 50, yPosition);

    yPosition += 18;

    doc.text(`Ingresos totales: $${totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`, 50, yPosition);

    // Footer
    const footerY = doc.page.height - 50;
    doc.fontSize(8)
       .fillColor(secondaryColor)
       .text(`Generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, 
             50, footerY, { align: 'center', width: doc.page.width - 100 });
  }

  private writePdfToDisk(pdfBuffer: Buffer, temporarity: string): void {
    try {
      // Crear directorio si no existe
      const outputDir = path.join(process.cwd(), 'generated-reports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generar nombre de archivo único
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `reporte-${temporarity}-${timestamp}.pdf`;
      const filepath = path.join(outputDir, filename);

      // Escribir archivo
      fs.writeFileSync(filepath, pdfBuffer);
      
      console.log(`PDF guardado en: ${filepath}`);
    } catch (error) {
      console.error('Error al escribir PDF en disco:', error);
    }
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}