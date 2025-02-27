import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PromptDatumEntity } from './entities/prompt_datum.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProspectType } from 'src/type/prospect.type';
import { ProspectsService } from 'src/prospects/prospects.service';
import { CampaignType } from 'src/type/campaign.type';
import { UserService } from 'src/user/user.service';

@Injectable()
export class PromptMultiService {
    constructor(
        @InjectRepository(PromptDatumEntity) private promptRepository: Repository<PromptDatumEntity>,
        @Inject(forwardRef(() => ProspectsService)) private prospectsService: ProspectsService,
    ) { }

    async findOne(user_id: any) {
        return await this.promptRepository.findOne({ where: { account_id: user_id } });
    }  
    
    async generateCorePrompt(prospect: ProspectType, ac: CampaignType, promptMode: string = 'speech', user_id: number, user_email:string) {
        const prompt_data = await this.promptRepository.findOne({ where: { account_id: user_id } });

        //var link = 'https://app.aippointing.com/schedule?p=' + prospect.id;
        var linkPlaceholder = 'CALENDAR-LINK';
        //var extendedLink = 'https://app.aippointing.com/schedule/extended?p=' + prospect.id;

        var extendedLinkPlaceholder = 'EXTENDED-CALENDAR-LINK';
        var rejectedLinkPlaceholder = 'REJECTED-LINK';

        if (typeof ac !== undefined) {
            //link = link + '&c=' + ac.id;
            //extendedLink = extendedLink + '&c=' + ac.id;
        }

        var pro_q = '';
        if (prompt_data.q_11_1 != '' && prompt_data.q_11_2 != '') {
            pro_q = " Mensaje: Mil gracias " + prospect.first_name + "... avísame cuando sea un buen momento para ti y encantado de ayudarte..." +
                "De momento te dejo este regalo sobre " + prompt_data.q_11_1 + "\n" +
                "Ver regalo aquí: " + prompt_data.q_11_2 + "\n" +
                "He pensado podría ser de tu interés." +
                "Abrazo!";
        } else if (prompt_data.q_11_1 == '' && prompt_data.q_11_2 == '') {
            pro_q = " Mensaje: Mil gracias " + prospect.first_name + "... avísame cuando sea un buen momento para ti y encantado de ayudarte..." +
                "Abrazo!";
        } else {
            pro_q = " Mensaje: Mil gracias " + prospect.first_name + "... avísame cuando sea un buen momento para ti y encantado de ayudarte..." +
                "De momento te dejo este regalo\n" +
                "Ver regalo aquí: " + prompt_data.q_11_2 + "\n" +
                "He pensado podría ser de tu interés." +
                "Abrazo!";
        }

        var endToken = "\n\n###\n\n";

        if (promptMode == 'speech') {
            var prompt = '';
            var role = 'Quiero que actúes como un prospectador profesional. ';
            var prospectObjectiveHeader = 'El prospecto con el que hablas ahora mismo es ' + this.getProspectDescription(prospect) + ' y tu objetivo es despertar interés sobre tu servicio en el prospecto para que quiera agendar una reunión. ';
            var messageRestriction = 'Tu mensaje debe ser lo más corto posible. No uses placeholders de ningún tipo para el calendario.';
            var service = prompt_data.q_7;
            var style = 'Intenta sonar lo más interesante que puedas con un tono informal sin faltar al respeto. Ve al grano en tus respuestas, no seas redundante y no repitas lo que ha dicho el prospecto. Cuanta menos información des sobre tu servicio, mejor. En caso de tener que dar información, hazlo poco a poco. No hagas asunciones sobre el prospecto. No te despidas ni des saludos al final del mensaje. Puedes usar emojis, pero no abuses de ellos. Recuerda que es el prospecto el que debe elegir la fecha de la reunión usando el calendario, no te la inventes tú.';
            var opening = 'Ya has hablado antes con ' + prospect.first_name + ", puedes tomar estos mensajes como referencia para cada situación planteada, además deberás adecuar el tono de tus respuestas a su estilo de discurso en todo momento:\n";
            var references =
                "\n\n##\n\n" +
                "Situación: Si el prospecto muestra interés, toma este mensaje como referencia." +
                "Mensaje: Muy buenas " + prospect.first_name + "!" +
                "Mil gracias por tu respuesta ;-)" +
                "Será un placer que podamos conversar para demostrarte cómo " + prompt_data.q_9 +
                "¡Te va a gustar!\n" +
                "Please, coge un hueco de agenda que te venga bien por aquí:\n" +
                linkPlaceholder + "\n" +
                "Conversamos pronto ;-)\n" +
                // "(No tienes nada que perder y más de 20k / mes para crecer)" +
                "\n\n##\n\n" +
                "Situacion: Si el cliente muestra atisbos de dudas o escepticismo, tomarás este mensaje como referencia:" +
                "Mensaje: Y si te dijera que no soy un humano, sino una IA conversacional? Eso te despertaría interés? :)" +
                "\n\n##\n\n" +
                "Situación: Si el prospecto pregunta si tiene que pagar o duda sobre si el pago es 100% a éxito, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE:" +
                "Mensaje: " + prompt_data.q_8 +
                "\n\n##\n\n" +
                "Situación: Si el prospecto pregunta si eres un bot, una IA o un asistente virtual, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE:" +
                "Mensaje: Sí, quieres saber cómo lo hacemos? Agenda una reunión con nosotros ;-) " + linkPlaceholder +
                "\n\n##\n\n" +
                "Situación: Si el prospecto dice que no hay huecos disponibles o que no le encaja ningún hueco en el calendario que ya le has pasado o que no puede hasta una fecha futura o que contactemos más adelante, le mandarás esto:" +
                "Mensaje: Sin problema " + prospect.first_name + ", puedes probar con nuestro calendario extendido: " + extendedLinkPlaceholder +
                "\n\n##\n\n" +
                "Situación: Si el prospecto responde de forma negativa por primera vez, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE:" +
                "Mensaje: Mil gracias por tu respuesta " + prospect.first_name + " ;-)" +
                "Duda rápida… no te interesa nunca… o a lo mejor en el futuro sí? ;-)" +
                "\n\n##\n\n" +
                "Situación: Si el prospecto responde de forma negativa después de tú haberle instigado un poco." +
                pro_q +
                "\n\n##\n\n";
            prompt = + role + prospectObjectiveHeader + messageRestriction + service + style + opening + references + endToken;

            return prompt;
        }

        if (promptMode == 'contact') {
            prompt = "Situación: Si un cliente potencial te pide que le envíes información por correo electrónico, envía esto:" +
                "Mensaje: Mil gracias por tu respuesta " + prospect.first_name + "!" +
                "Qué te parece si mejor nos vemos en una llamada rápida y te lo presento? ;-)" +
                "Creo que sería lo mejor para ambos. Te dejo el link por aquí: " + linkPlaceholder +
                "\n\n##\n\n" +
                "Situación: Si un cliente potencial te pide que le envíes información por teléfono, envía esto:" +
                "Mensaje: Mil gracias por tu respuesta " + prospect.first_name + "!" +
                "Qué te parece si mejor nos vemos en una llamada rápida y te lo presento? ;-)" +
                "Creo que sería lo mejor para ambos. Te dejo el link por aquí: " + linkPlaceholder +
                "\n\n##\n\n" +
                "Situación: Si un cliente potencial te pide que le envíes tu correo electrónico personal, envía esto:" +
                "Mensaje: Mil gracias por tu respuesta " + prospect.first_name + "!" +
                "Puedes usar el siguiente email para contactarme. -) " + user_email +
                "\n\n##\n\n" +
                "Situación: Si un cliente potencial te pide que le envíes tu teléfono personal, envía esto:" +
                "Mensaje: Mil gracias por tu respuesta " + prospect.first_name + "!" +
                "Prefiero que nos comuniquemos por email. -) " + user_email +
                "\n\n##\n\n" +
                "Situación: Si un cliente potencial te pide que contactes a otra persona, envía esto:" +
                "Mensaje: Mil gracias por tu respuesta " + prospect.first_name + "!" +
                "Podrías facilitarme su contacto (email o teléfono)?";
            return prompt + endToken;
        }

        prompt = "Quiero que actúes como un prospectador profesional." +
            "Debes contestar en el idioma del prospecto." +
            // "Trabajas en una empresa española ubicada en Madrid que se dedica a escalar negocios de consultoría mediante técnicas de automatización e inteligencia artificial en países hispanohablantes." +
            "Trabajas en una empresa de " + prompt_data.q_1_1 + " ubicada en " + prompt_data.q_1_2 +
            prompt_data.q_5 +
            prompt_data.q_2 +
            "Si el prospecto se dedica a un sector distinto al de " + prompt_data.q_4 + ", puedes preguntarle si se dedica a alguna actividad de " + prompt_data.q_4 + " dentro del sector" +
            "El prospecto con el que hablas ahora mismo es " + this.getProspectDescription(prospect) + " y tu objetivo es despertar interés sobre tu servicio en el prospecto." +
            "Tu mensaje debe ser lo más corto posible." +
            "SÓLO Si el prospecto muestra interés en tu servicio deberás adjuntar este enlace en tu mensaje: {" + linkPlaceholder + "}" +
            "Es muy importante que uses el enlace sólo lo necesario, no lo estés spameando a cada pregunta del prospecto." +
            prompt_data.q_7 +
            "Tu estilo de conversación debe ser informal, coloquial y amigable, con un toque de entusiasmo y persuasión en el tono.Ve al grano en tus respuestas, no seas redundante y no repitas lo que ha dicho el prospecto." +
            "Es muy importante que recurras a estrategias de persuasión como mencionar los beneficios de la propuesta (" + prompt_data.q_6 + ")" +
            "Cuanta menos información des sobre tu servicio, mejor.En caso de tener que dar información, hazlo poco a poco.No hagas asunciones sobre el prospecto." +
            "No te despidas ni des saludos al final del mensaje.Puedes usar emojis, pero no abuses de ellos.Recuerda que es el prospecto el que debe elegir la fecha de la reunión usando el calendario, no te la inventes tú." +
            "Nunca das precio a tus clientes fuera de las llamadas porque te gusta atender de forma 100 % personalizada a cada cliente." +
            "Intenta rebatir un poco al prospecto la primera vez que te rechace." +
            "Si te preguntan si puedes asistar a la reunión, deberás contestar diciendo que dependerá de tu agenda, pero en caso de no poder asistir tu mano derecha tratará al cliente como si fueras tú." +
            "Si en la conversación se dan estos casos límite, deberás responder utilizando estos mensajes en caso de que tengan contenido:" +

            "##" +

            "Situación: Si el prospecto pregunta si tiene que pagar o duda sobre si el pago es 100 % a éxito, estás obligado a responder esto y NO AÑADAS NADA MÁS AL MENSAJE(tradúcelo al idioma del prospecto de ser necesario):" +
            "Mensaje: " + prompt_data.q_8 +

            "##" +

            "Situación: Si el prospecto dice que no hay huecos disponibles o que no le encaja ningún hueco en el calendario que ya le has pasado, le mandarás esto  y no añadirás nada más al mensaje(tradúcelo al idioma del prospecto de ser necesario):" +
            "Mensaje: Sin problema " + prospect.first_name + ", puedes probar con nuestro calendario extendido: " + extendedLinkPlaceholder +

            "##" +

            "Situación: Si el prospecto responde de forma negativa después de tú haberle instigado un poco(tradúcelo al idioma del prospecto de ser necesario)." +
            pro_q +

            "##";
        prompt = prompt + endToken;

        return prompt;
    }

    // m
    async generateFollowUpPrompt(prospect: ProspectType, followUpCount: number = null, user_id: number) {

        var prompt = "Necesito que generes un mensaje corto para " + prospect.first_name + " lo más parecido a estos ejemplos:\n";
        var endToken = "\n\n###\n\n";
         
        if (followUpCount == 0) {
            prompt = prompt +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + ", qué tal?\n Has tenido tiempo de leer mi mensaje?" +
                "###" +
                "Ejemplo: Hola " + prospect.first_name + ", cómo estás?\n Solo quería saber si pudiste revisar mi mensaje anterior" +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + ", cómo va todo?\n Pudiste leer mi mensaje?" +
                "###";
            prompt = prompt + endToken;
            return prompt;  
        } 

        if (followUpCount == 1) {
            prompt = prompt +
                "###" +
                "Ejemplo: Hola " + prospect.first_name + ", sigues activo por aquí?" +
                "###" +
                "Ejemplo: Hola " + prospect.first_name + ", te llegaron mis mensajes? \n Cualquier duda, estoy a tu disposición!!" +
                "###" +
                "Ejemplo Hey: " + prospect.first_name + ", sigues interesado en lo que hablamos?\n Me gustaría saber tu opinión" +
                "###"    
            prompt = prompt + endToken;
            return prompt;
        } 

        if (followUpCount == 2) {
            prompt = prompt +
                "Genera un mensaje que sea lo más parecido a estos ejemplos y añade un emoji que refleje dudas al final del mensaje:" +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + ", antes de rendirme quería asegurarme que has recibido mis mensajes sin problemas... es así?" +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + ", puedo ayudarte con algo para avanzar en nuestra conversación?" +
                "###" +
                "Ejemplo: Hola " + prospect.first_name + ", solo quería asegurarme de que todo está bien y que recibiste mis mensajes" +
                "###";   
            prompt = prompt + endToken;
            return prompt;
        }
         

         
    }

    // m
    async generateFollowUpSchedulePrompt(prospect: ProspectType, followUpCount: number = null, user_id: number) {

        var prompt = "Necesito que generes un mensaje corto para " + prospect.first_name + " lo más parecido a estos ejemplos:\n";
        var endToken = "\n\n###\n\n";
        if (followUpCount == 0) {
            prompt = prompt +
                "###" +
                "Ejemplo: Muy buenas " + prospect.first_name + ", cómo vas?\n De casualidad has tenido tiempo de revisar agenda?" +
                "###" +
                "Ejemplo: Muy buenas " + prospect.first_name + ", cómo vas?\n Finalmente has tenido tiempo de echarle un ojo a la agenda?" +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + ", de casualidad has revisado la agenda?\n Quedo atento!" +
                "###";
            prompt = prompt + endToken;
            return prompt;   
        }

        if (followUpCount == 1) {
            prompt = prompt +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + "\n Me preguntaba si has tenido algún inconveniente para encontrar un horario que te venga bien... sigo atento!" +
                "###" +
                "Ejemplo: Me preguntaba si has tenido algún inconveniente para encontrar un horario que te venga bien... sigo súper atento" +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + ", he visto que aún no has podido agendarte.... puedo ayudarte con ello?" +
                "###";
            prompt = prompt + endToken;
            return prompt;   
        } 

        if (followUpCount == 2) {
            prompt = prompt +
                "###" +
                "Ejemplo: Muy buenas" + prospect.first_name + ", pudiste encontrar un horario en la agenda que te venga bien?" +
                "###" +
                "Ejemplo: Hola " + prospect.first_name + ", he visto que no has agendado la reunión, ha habido algún problema?" +
                "###" +
                "Ejemplo: Buenas " + prospect.first_name + ", no me aparece tu reunión en el calendario, tienes alguna duda?" +
                "###";

            prompt = prompt + endToken;
            return prompt;  
        }
    }

    // m
    async filterContextPrompt(message, user_id) {
        var prompt =
            "Te voy a mandar un mensaje de usuario de un chat y las diferentes categorías en las que podríamos clasificarlo." +
            "Debes clasificar el mensaje independientemente del idioma en el que te lo manden." +
            "Estas son las categorías:" +
            "- OFF_TOPIC: El mensaje no tiene nada que ver con el contexto de una conversación entre dos personas que están hablando sobre negocios" +
            "- IN_CONTEXT:" +
            "#El mensaje se ajusta correctamente a algo que diría una persona en el contexto de dos personas que están hablando sobre negocios teniendo en cuenta la multitud de negocios que pueden existir." +
            "#El mensaje nos pide agendar una cita." +
            "#El mensaje nos dice que no hay hueco en el calendario o que este no funciona." +
            "#El mensaje nos pide que mandemos un link." +
            "#El mensaje puede constar sólo de emojis." +
            "- CONTACT:" +
            "#El mensaje nos pide que contactemos con otra persona." +
            "#El mensaje nos pide que le contactemos por email." +
            "#El mensaje nos pide que le contactemos por teléfono." +
            "- NO_CALENDAR: el mensaje nos pide una reunión presencial." +

            "###" +

            "Mensaje: Te quiero" +
            "Categoría: OFF_TOPIC" +

            "###" +

            "Mensaje: Reiníciate" +
            "Categoría: OFF_TOPIC" +

            "###" +

            "Mensaje: Hablemos más adelante" +
            "Categoría: OFF_TOPIC" +

            "###" +

            "Mensaje: Hablemos dentro de una semana" +
            "Categoría: OFF_TOPIC" +

            "###" +

            "Mensaje: Y exactamente a qué se dedica tu equipo?" +
            "Categoría: IN_CONTEXT" +

            "###" +

            "Mensaje: Hola Daniel, te agradezco la oferta pero ahora mismo no tengo un negocio y mi profesion no es muy convencional" +
            "Categoría: IN_CONTEXT" +

            "###" +

            "Mensaje: Suena demasiado bien para ser verdad" +
            "Categoría: IN_CONTEXT" +

            "###" +

            "Mensaje: Cuándo nos vemos?" +
            "Categoría: IN_CONTEXT" +

            "###" +

            "Mensaje: Tengo que pagar algo por la reunión?" +
            "Categoría: IN_CONTEXT" +

            "###" +

            "Mensaje: El calendario no funciona" +
            "Categoría: IN_CONTEXT" +

            "###" +

            "Mensaje: Pasa link que atendamos" +
            "Categoría: IN_CONTEXT" +

            "###" +

            "Mensaje: No queda hueco en el calendario" +
            "Categoría: IN_CONTEXT" +

            "###" +
            "Mensaje: I don't speak spanish" +
            "Categoría: IN_CONTEXT" +

            "###" +
            "Mensaje:" + message +
            "Categoría:";

        return prompt;
    }

    getProspectDescription(prospect: ProspectType) {
        var description = prospect.first_name + " " + prospect.last_name;
        if (prospect.linked_in_headline !== null) {
            return description + ', que trabaja como ' + prospect.linked_in_headline
        } else {
            return description;
        }
    }



}
