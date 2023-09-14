import { prisma } from "../lib/prisma";

import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";

import fs from "node:fs";
import path from "node:path";

import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream"
import { promisify } from "node:util"

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {

    const baseMb = 1_048_576
    const maxFileSize = 25

    app.register(fastifyMultipart, {
        limits: {
            fileSize: maxFileSize * baseMb
        }
    })

    app.post("/videos", async(req, res) => {

        const data = await req.file()

        if (!data) {
            return res.status(400).send({
                error: "No file was uploaded!"
            })
        }

        const extension = path.extname(data.filename)

        if (extension !== '.mp3') {
            return res.status(400).send({
                error: "Only mp3 files are allowed!"
            })
        }

        const fileBaseName = path.basename(data.filename, extension)
        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
        const uploadDestination = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDestination))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestination
            }
        })

        return {video}
    })
}
