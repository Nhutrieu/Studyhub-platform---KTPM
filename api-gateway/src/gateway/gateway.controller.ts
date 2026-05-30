import { Controller, All, Req, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ApiTags, ApiExcludeController } from '@nestjs/swagger';

@ApiTags('Gateway')
@ApiExcludeController()
@Controller()
export class GatewayController {
  private readonly serviceRoutes: Map<string, string> = new Map([
    ['/api/auth', process.env.AUTH_SERVICE_URL || 'http://auth-service:3002'],
    ['/api/users', process.env.USER_SERVICE_URL || 'http://user-service:3003'],
    ['/api/products', process.env.PRODUCT_SERVICE_URL || 'http://product-service:3004'],
    ['/api/orders', process.env.ORDER_SERVICE_URL || 'http://order-service:3005'],
    ['/api/shipping', process.env.SHIPPING_SERVICE_URL || 'http://shipping-service:3006'],
    ['/api/reviews', process.env.REVIEW_SERVICE_URL || 'http://review-service:3007'],
    ['/api/chat', process.env.CHAT_SERVICE_URL || 'http://chat-service:3008'],
    ['/api/warehouse', process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-service:3009'],
    ['/api/disputes', process.env.DISPUTE_SERVICE_URL || 'http://dispute-service:3010'],
    ['/api/settings', process.env.SETTINGS_SERVICE_URL || 'http://settings-service:3011'],
    ['/api/upload', process.env.UPLOAD_SERVICE_URL || 'http://upload-service:3012'],
    ['/api/categories', process.env.CATEGORY_SERVICE_URL || 'http://category-service:3013'],
    ['/api/dashboard', process.env.DASHBOARD_SERVICE_URL || 'http://dashboard-service:3014'],
    ['/api/payments', process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3015'],
    ['/api/promotions', process.env.PROMOTION_SERVICE_URL || 'http://promotion-service:3016'],
    ['/api/branches', process.env.BRANCH_SERVICE_URL || 'http://branch-service:3017'],
    ['/api/wallet', process.env.WALLET_SERVICE_URL || 'http://wallet-service:3018'],
    ['/api/cart', process.env.CART_SERVICE_URL || 'http://cart-service:3019'],
    // Proxy static files from upload service (primary - images)
    ['/images', process.env.UPLOAD_SERVICE_URL || 'http://upload-service:3012'],
    // Keep /uploads for backward compatibility
    ['/uploads', process.env.UPLOAD_SERVICE_URL || 'http://upload-service:3012'],
  ]);

  @All('*')
  proxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path;
    
    // Find matching service route
    let targetUrl: string | undefined;
    let routePrefix: string | undefined;

    for (const [route, url] of this.serviceRoutes.entries()) {
      if (path.startsWith(route)) {
        targetUrl = url;
        routePrefix = route;
        break;
      }
    }

    if (!targetUrl || !routePrefix) {
      throw new HttpException(
        `No service found for path: ${path}`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Gateway] Proxying ${req.method} ${path} to ${targetUrl}${path}`);
    }

    // Create proxy middleware
    // For /images and /uploads, proxy directly without /api prefix
    // For other routes, microservices have /api prefix, so we forward the path as-is
    const pathRewrite: any = {};
    if (routePrefix === '/images' || routePrefix === '/uploads') {
      // For static files, no path rewrite needed - upload service serves at root
      pathRewrite[`^${routePrefix}`] = routePrefix;
    }
    
    const proxy = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      timeout: 60000, // 60 seconds timeout for file uploads
      proxyTimeout: 60000,
      pathRewrite: Object.keys(pathRewrite).length > 0 ? pathRewrite : undefined,
      // Preserve the request body for multipart/form-data
      preserveHeaderKeyCase: true,
      onError: (err, req, res) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Proxy error:', err.message);
          console.error('Request path:', req.url);
          console.error('Target URL:', targetUrl);
        }
        if (!(res as Response).headersSent) {
          (res as Response).status(HttpStatus.BAD_GATEWAY).json({
            success: false,
            statusCode: HttpStatus.BAD_GATEWAY,
            message: `Service unavailable: ${err.message}`,
            data: null,
          });
        }
      },
      onProxyReq: (proxyReq, req) => {
        // Forward original headers (http-proxy-middleware handles body automatically)
        // Forward all headers including Content-Type for multipart/form-data
        if (req.headers.authorization) {
          proxyReq.setHeader('Authorization', req.headers.authorization as string);
        }
        
        // Preserve Content-Type for multipart/form-data
        if (req.headers['content-type']) {
          proxyReq.setHeader('Content-Type', req.headers['content-type'] as string);
        }
        
        // Log upload requests for debugging
        if (process.env.NODE_ENV !== 'production' && path.includes('/upload')) {
          console.log(`[Gateway] Proxying upload request: ${req.method} ${path} to ${targetUrl}${path}`);
          console.log(`[Gateway] Content-Type: ${req.headers['content-type']}`);
          console.log(`[Gateway] Content-Length: ${req.headers['content-length']}`);
        }
      },
      onProxyRes: (proxyRes, req, res) => {
        // Log upload responses for debugging
        if (process.env.NODE_ENV !== 'production' && path.includes('/upload')) {
          console.log(`[Gateway] Upload response status: ${proxyRes.statusCode}`);
        }
      },
      logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    });

    return proxy(req, res, (err) => {
      if (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Proxy middleware error:', err);
        }
        if (!res.headersSent) {
          res.status(HttpStatus.BAD_GATEWAY).json({
            success: false,
            statusCode: HttpStatus.BAD_GATEWAY,
            message: `Proxy error: ${err.message}`,
            data: null,
          });
        }
      }
    });
  }
}

