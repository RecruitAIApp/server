export const isValidId = (value, helpers) => {
    return isValidObjectId(value) ? value : helpers.message("Invalid ObjectId");
}

export const generalFields = {
    id :  joi.custom(isValidId) ,
    attachment : joi.object({
                fieldname : joi.string().required(),
                originalname : joi.string().required(),
                encoding : joi.string().required(),
                mimetype : joi.string().required(),
                destination : joi.string().required(),
                filename : joi.string().required(),
                path : joi.string().required(),
                size : joi.number().required()
        }),
}