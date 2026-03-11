export default function identifierValidator(identifier){
    if(identifier.trim().includes("@")) return "email";
    return "phone_number"
}