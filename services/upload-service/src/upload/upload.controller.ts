import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  UsePipes,
  Param,
  Res,
  NotFoundException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../common/config/rbac-matrix';
import { ValidationPipe } from "@nestjs/common";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { v4 as uuidv4 } from "uuid";
import { Response } from "express";
import { existsSync, readFileSync } from "fs";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  /**
   * Get image by folder and filename
   * @param folder - Folder name (products, hero, categories, etc.)
   * @param filename - Image filename
   */
  @Get(":folder/:filename")
  @ApiOperation({ summary: "Get uploaded image" })
  async getImage(
    @Param("folder") folder: string,
    @Param("filename") filename: string,
    @Res() res: Response
  ) {
    // Security: Validate folder and filename to prevent path traversal
    const validFolders = [
      "products",
      "hero",
      "categories",
      "files",
      "logos",
      "users",
    ];
    if (
      !validFolders.includes(folder) ||
      filename.includes("..") ||
      filename.startsWith("/")
    ) {
      throw new BadRequestException("Invalid folder or filename");
    }

    const filePath = join(process.cwd(), "images", folder, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`Image not found: ${folder}/${filename}`);
    }

    try {
      const fileBuffer = readFileSync(filePath);
      const ext = filename.split(".").pop()?.toLowerCase();
      const contentType = this.getContentType(ext);

      return res
        .set({
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, immutable", // 24 hours cache
          "Content-Length": fileBuffer.length,
        })
        .send(fileBuffer);
    } catch (error) {
      throw new BadRequestException(`Failed to read image: ${filename}`);
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(ext: string | undefined): string {
    const types: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      glb: "model/gltf-binary",
      gltf: "model/gltf+json",
      obj: "text/plain",
      fbx: "application/octet-stream",
      pdf: "application/pdf",
    };
    return types[ext?.toLowerCase() || ""] || "application/octet-stream";
  }

  @Post("image")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.BRANCH_MANAGER, Role.SHIPPER)
  @ApiOperation({ summary: "Upload ảnh sản phẩm hoặc bằng chứng giao hàng" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./images/products",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(
            new BadRequestException(
              "Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp)"
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Không có file được upload");
    }

    // Return relative URL - frontend will handle full URL
    const fileUrl = `/images/products/${file.filename}`;
    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post("images")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: "Upload nhiều ảnh sản phẩm" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: diskStorage({
        destination: "./images/products",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(
            new BadRequestException(
              "Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp)"
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Không có file được upload");
    }

    // Return relative URLs - frontend will handle full URL
    return files.map((file) => ({
      url: `/images/products/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));
  }

  @Post("file")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.EMPLOYEE, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: "Upload file (3D model, documents, etc.)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./images/files",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Allow 3D model files (glb, gltf, obj, fbx, etc.) and other files
        const allowedExtensions = [
          ".glb",
          ".gltf",
          ".obj",
          ".fbx",
          ".dae",
          ".3ds",
          ".blend",
          ".stl",
        ];
        const fileExt = extname(file.originalname).toLowerCase();
        if (
          allowedExtensions.includes(fileExt) ||
          file.mimetype.includes("model") ||
          file.mimetype.includes("application")
        ) {
          cb(null, true);
        } else {
          return cb(
            new BadRequestException(
              "Chỉ chấp nhận file 3D model hoặc file hợp lệ"
            ),
            false
          );
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB for 3D models
      },
    })
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Không có file được upload");
    }

    // Return relative URL - frontend will handle full URL
    const fileUrl = `/images/files/${file.filename}`;
    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post("hero")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: "Upload ảnh hero banner" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./images/hero",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(
            new BadRequestException(
              "Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp)"
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB for hero images
      },
    })
  )
  async uploadHero(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Không có file được upload");
    }

    // Return relative URL - frontend will handle full URL
    const fileUrl = `/images/hero/${file.filename}`;
    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post("category")
  @ApiBearerAuth()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles(Role.ADMIN, Role.BRANCH_MANAGER)
  @ApiOperation({ summary: "Upload ảnh category" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./images/categories",
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(
            new BadRequestException(
              "Chỉ chấp nhận file ảnh (jpg, jpeg, png, gif, webp)"
            ),
            false
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    })
  )
  async uploadCategory(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Không có file được upload");
    }

    // Return relative URL - frontend will handle full URL
    const fileUrl = `/images/categories/${file.filename}`;
    return {
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
